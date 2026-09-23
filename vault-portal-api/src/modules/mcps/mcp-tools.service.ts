import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "child_process";
import { lookup } from "dns/promises";

type InstallMethod = "npx" | "uvx" | "docker" | "remote" | "unknown";

interface InstallInfo {
  method: InstallMethod;
  target: string;
}

/** 简化版安装方式推断（与前端 mcpInstall.ts 逻辑一致） */
function inferInstall(mcp: {
  endpoint?: string;
  name: string;
  description?: string;
}): InstallInfo {
  const raw = (mcp.endpoint ?? "").trim();
  const lower = raw.toLowerCase();

  // GitHub 仓库优先匹配（应走 npx/uvx，而非 remote HTTP）
  if (lower.includes("github.com/")) {
    const repo =
      lower
        .split("github.com/")[1]
        ?.split("/")[1]
        ?.replace(/\.git$/, "") ?? "";
    if (
      repo.startsWith("mcp-server-") ||
      repo.endsWith("-mcp") ||
      repo.includes("_")
    ) {
      return { method: "uvx", target: repo };
    }
    if (repo) return { method: "npx", target: repo };
  }

  // 远程 HTTP/SSE MCP endpoint
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.includes("/sse")
  ) {
    return { method: "remote", target: raw };
  }

  const registries = [
    "docker.io/",
    "ghcr.io/",
    "registry.",
    "quay.io/",
    "gcr.io/",
  ];
  if (
    registries.some((r) => lower.startsWith(r)) ||
    (!raw.startsWith("@") && lower.includes(":") && lower.includes("/"))
  ) {
    return { method: "docker", target: raw };
  }

  if (raw.startsWith("@") || /^[a-z0-9][a-z0-9-]*\/[a-z0-9-]+$/i.test(raw)) {
    return { method: "npx", target: raw };
  }

  if (raw && /^[a-z0-9][a-z0-9-]*$/i.test(raw)) {
    return { method: "npx", target: raw };
  }

  return { method: "unknown", target: raw || mcp.name };
}

/** 判定 IP 是否属于私网/保留段（SSRF 防护） */
function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    // IPv6（含 IPv4-mapped ::ffff:a.b.c.d）
    const v4Mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Mapped) return isPrivateIp(v4Mapped[1]);
    const lower = ip.toLowerCase();
    if (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    ) {
      return true;
    }
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // 本段/私网/环回
  if (a === 169 && b === 254) return true; // 链路本地 / 云元数据
  if (a === 172 && b >= 16 && b <= 31) return true; // 私网
  if (a === 192 && b === 168) return true; // 私网
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // 组播/保留
  return false;
}

/**
 * MCP 工具列表探测服务。
 *
 * 通过 stdio（npx/uvx/docker）或 SSE/HTTP 连接 MCP 服务器，
 * 执行 MCP 协议握手（initialize → initialized → tools/list），
 * 获取服务器暴露的工具列表及输入参数 Schema。
 *
 * 结果缓存在内存中，避免重复 spawn 进程；
 * 探测失败也写入短 TTL 负缓存，避免对同一坏端点反复 spawn/下载。
 */
@Injectable()
export class McpToolsService {
  private readonly logger = new Logger(McpToolsService.name);
  private cache = new Map<
    string,
    { tools: McpTool[]; fetchedAt: number; ttl: number }
  >();
  private inFlight = new Set<string>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 成功结果缓存 1 小时
  private readonly NEGATIVE_TTL = 1000 * 60 * 5; // 失败/空结果缓存 5 分钟
  private readonly TIMEOUT_MS = 15000;

  /**
   * 获取 MCP 服务器的工具列表。
   * 优先读缓存，缓存未命中则尝试连接服务器探测。
   */
  async getTools(mcp: {
    slug: string;
    name: string;
    endpoint?: string;
    description?: string;
  }): Promise<{
    tools: McpTool[];
    source: "cache" | "live" | "unavailable";
    note?: string;
  }> {
    const cacheKey = mcp.slug;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < cached.ttl) {
      return { tools: cached.tools, source: "cache" };
    }

    // 并发去重：同一 MCP 同时只有一个探测在跑
    if (this.inFlight.has(cacheKey)) {
      return {
        tools: [],
        source: "unavailable",
        note: "正在探测中，请稍后刷新",
      };
    }

    const install = inferInstall(mcp);

    // 基本校验：防止 target 包含 npx 额外参数
    if (
      (install.method === "npx" || install.method === "uvx") &&
      !/^[@a-z0-9][a-z0-9._/-]*$/i.test(install.target)
    ) {
      return {
        tools: [],
        source: "unavailable",
        note: "MCP endpoint 格式不合法，无法自动探测。",
      };
    }

    // docker 镜像引用校验（镜像名/registry/tag/digest，禁止空白与 shell 元字符）
    if (
      install.method === "docker" &&
      !/^[a-z0-9][a-z0-9._/-]*(:[\w][\w.-]{0,127})?(@sha256:[a-f0-9]{64})?$/i.test(
        install.target,
      )
    ) {
      return {
        tools: [],
        source: "unavailable",
        note: "MCP endpoint 不是合法的镜像引用，无法自动探测。",
      };
    }

    // stdio 探测会在本机执行 npx/uvx/docker——即从公共注册表拉取并运行
    // 第三方代码，等同任意代码执行。endpoint 可被普通用户经投稿写入，
    // 因此生产环境默认禁用；如需启用须显式设置 MCP_STDIO_PROBE_ENABLED=true
    // 并自行保证在沙箱/隔离环境中运行。
    if (
      (install.method === "npx" ||
        install.method === "uvx" ||
        install.method === "docker") &&
      process.env.NODE_ENV === "production" &&
      process.env.MCP_STDIO_PROBE_ENABLED !== "true"
    ) {
      return {
        tools: [],
        source: "unavailable",
        note: "本地进程探测已在生产环境禁用，请安装后在客户端查看工具列表。",
      };
    }

    this.inFlight.add(cacheKey);

    try {
      let tools: McpTool[] = [];

      if (install.method === "remote") {
        // SSRF 防护：endpoint 必须是公网 http(s) 地址
        await this.assertPublicHttpUrl(install.target);
        tools = await this.listRemoteTools(install.target);
      } else if (
        install.method === "npx" ||
        install.method === "uvx" ||
        install.method === "docker"
      ) {
        tools = await this.listStdioTools(install.method, install.target);
      } else {
        return {
          tools: [],
          source: "unavailable",
          note: "无法自动探测该 MCP 服务器的工具列表，请安装后在客户端查看。",
        };
      }

      // 成功且有工具：长缓存；失败或为空：短负缓存，防止对坏端点反复 spawn
      this.cache.set(cacheKey, {
        tools,
        fetchedAt: Date.now(),
        ttl: tools.length > 0 ? this.CACHE_TTL : this.NEGATIVE_TTL,
      });
      return { tools, source: "live" };
    } catch (err) {
      this.logger.warn(
        `探测 MCP ${mcp.name} 工具列表失败: ${(err as Error).message}`,
      );
      this.cache.set(cacheKey, {
        tools: [],
        fetchedAt: Date.now(),
        ttl: this.NEGATIVE_TTL,
      });
      return {
        tools: [],
        source: "unavailable",
        note: `探测失败（${(err as Error).message}），请安装后在客户端查看工具列表。`,
      };
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  /** 校验远程 endpoint 为公网 http(s) 地址（域名解析到私网/保留段同样拒绝） */
  private async assertPublicHttpUrl(raw: string): Promise<void> {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new Error("endpoint 不是合法 URL");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("endpoint 仅允许 http(s) 协议");
    }
    const addrs = await lookup(u.hostname, { all: true }).catch(() => null);
    if (!addrs || addrs.length === 0) {
      throw new Error("endpoint 域名无法解析");
    }
    for (const { address } of addrs) {
      if (isPrivateIp(address)) {
        throw new Error("endpoint 指向内网/保留地址，已拦截");
      }
    }
  }

  /**
   * 通过 stdio 连接 MCP 服务器并列出工具。
   * 执行 MCP 协议：initialize → notifications/initialized → tools/list
   */
  private async listStdioTools(
    method: "npx" | "uvx" | "docker",
    target: string,
  ): Promise<McpTool[]> {
    return new Promise((resolve, reject) => {
      const cmd =
        method === "npx" ? "npx" : method === "uvx" ? "uvx" : "docker";
      const args =
        method === "npx"
          ? ["-y", target]
          : method === "uvx"
            ? [target]
            : ["run", "-i", "--rm", target];

      const child = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NODE_ENV: "production" },
      });

      let stdout = "";
      let stderr = "";
      let toolsRequested = false;
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("连接超时"));
      }, this.TIMEOUT_MS);

      const send = (obj: Record<string, any>) => {
        child.stdin.write(JSON.stringify(obj) + "\n");
      };

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
        // 只有当 buffer 不以 \n 结尾时，最后一行才是不完整的
        const endsWithNewline = stdout.endsWith("\n");
        const segments = stdout.split("\n");
        if (!endsWithNewline) {
          stdout = segments.pop() ?? ""; // 保留不完整的最后一行
        } else {
          stdout = ""; // 全部完整，清空 buffer
          segments.pop(); // 移除末尾空字符串
        }

        for (const line of segments) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as McpJsonRpcMessage;
            // initialize 响应
            if (msg.id === 1 && msg.result) {
              send({ jsonrpc: "2.0", method: "notifications/initialized" });
              // 短暂延迟后请求工具列表
              setTimeout(() => {
                if (!toolsRequested) {
                  toolsRequested = true;
                  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
                }
              }, 300);
            }
            // tools/list 响应
            if (msg.id === 2 && msg.result) {
              clearTimeout(timer);
              child.kill("SIGKILL");
              const tools = (msg.result.tools ?? []).map((t) => ({
                name: t.name ?? "",
                description: t.description ?? "",
                inputSchema: t.inputSchema ?? {},
              }));
              resolve(tools);
            }
          } catch {
            // 非 JSON 行，忽略
          }
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`无法启动 ${cmd}: ${err.message}`));
      });

      child.on("exit", (code) => {
        clearTimeout(timer);
        if (!toolsRequested) {
          reject(
            new Error(
              `进程退出 (code=${code}) ${stderr ? ": " + stderr.slice(0, 200) : ""}`,
            ),
          );
        }
      });

      // 发送 initialize 请求
      send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "vault-portal", version: "1.0.0" },
        },
      });
    });
  }

  /**
   * 通过 Streamable HTTP / SSE 连接远程 MCP 服务器列出工具。
   *
   * 支持两种传输：
   * 1. Streamable HTTP：直接 POST JSON-RPC 到 endpoint，响应头含 Mcp-Session-Id
   * 2. SSE：先 GET /sse 获取 POST endpoint，再 POST JSON-RPC
   */
  private async listRemoteTools(url: string): Promise<McpTool[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      // 尝试 Streamable HTTP（直接 POST 到 endpoint）
      const tools = await this.tryStreamableHttp(url, controller.signal);
      if (tools.length > 0) return tools;

      // 回退：尝试 SSE 传输（GET /sse 获取 endpoint）
      const sseTools = await this.trySseTransport(url, controller.signal);
      return sseTools;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Streamable HTTP 传输：POST JSON-RPC，维护 session */
  private async tryStreamableHttp(
    baseUrl: string,
    signal: AbortSignal,
  ): Promise<McpTool[]> {
    const endpoint = baseUrl.replace(/\/$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    // 1. initialize
    const initRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "vault-portal", version: "1.0.0" },
        },
      }),
      signal,
    });

    if (!initRes.ok) return [];

    // SSE 类型响应：Streamable HTTP 不适用，立即回退到 SSE 传输
    const contentType = initRes.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return [];
    }

    // 提取 session ID
    const sessionId = initRes.headers.get("mcp-session-id") || "";
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    // 解析 initialize 响应（可能是 JSON 或 SSE）
    const initBody = await initRes.text();
    const initMsg = this.parseMcpResponse(initBody);
    if (!initMsg?.result) return [];

    // 2. notifications/initialized（fire and forget）
    fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
      signal,
    }).catch(() => {});

    // 3. tools/list
    await new Promise((r) => setTimeout(r, 200));
    const toolsRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
      signal,
    });

    if (!toolsRes.ok) return [];
    const toolsBody = await toolsRes.text();
    const toolsMsg = this.parseMcpResponse(toolsBody);
    if (!toolsMsg?.result?.tools) return [];

    return (toolsMsg.result.tools ?? []).map((t) => ({
      name: t.name ?? "",
      description: t.description ?? "",
      inputSchema: t.inputSchema ?? {},
    }));
  }

  /** SSE 传输：GET /sse 获取 endpoint，再 POST */
  private async trySseTransport(
    baseUrl: string,
    signal: AbortSignal,
  ): Promise<McpTool[]> {
    const sseUrl = `${baseUrl.replace(/\/$/, "")}/sse`;

    // GET /sse，从 endpoint 事件中提取 POST URL
    const sseRes = await fetch(sseUrl, { signal });
    if (!sseRes.ok) return [];

    const sseText = await sseRes.text();
    const endpointMatch = sseText.match(/event:\s*endpoint\s*\ndata:\s*(\S+)/);
    if (!endpointMatch) return [];

    const postEndpoint = endpointMatch[1];
    // 相对路径转绝对
    const postUrl = postEndpoint.startsWith("http")
      ? postEndpoint
      : new URL(postEndpoint, baseUrl).toString();

    // 远端返回的 POST 地址必须与本站 endpoint 同源，
    // 防止恶意 MCP 服务器指挥本服务向任意第三方/内网地址发请求
    if (new URL(postUrl).origin !== new URL(baseUrl).origin) {
      return [];
    }

    // 复用 Streamable HTTP 的 POST 逻辑
    return this.tryStreamableHttp(postUrl, signal);
  }

  /** 解析 MCP 响应：支持纯 JSON 和 SSE 格式（data: {...}） */
  private parseMcpResponse(body: string): McpJsonRpcMessage | null {
    const trimmed = body.trim();
    if (!trimmed) return null;

    // 纯 JSON
    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed) as McpJsonRpcMessage;
      } catch {
        // fall through
      }
    }

    // SSE 格式：找最后一个 data: 行
    const dataLines = trimmed
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim());

    for (let i = dataLines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(dataLines[i]) as McpJsonRpcMessage;
        if (parsed.id || parsed.result) return parsed;
      } catch {
        // continue
      }
    }
    return null;
  }
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * 外部（本地 MCP 进程 / 远端服务）返回的原始工具条目。
 * 字段可能缺失，统一在归一化处补全，避免把 any 泄漏到调用方。
 */
interface McpRawTool {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** tools/list 的 result 载荷 */
interface McpToolsListResult {
  tools?: McpRawTool[];
}

/**
 * MCP JSON-RPC 2.0 消息。外部响应结构不受控，只声明本文件实际用到的字段，
 * 解析边界处做一次显式收窄，后续访问即为类型安全。
 */
interface McpJsonRpcMessage {
  id?: number | string;
  result?: McpToolsListResult;
  error?: { code?: number; message?: string };
}
