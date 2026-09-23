/**
 * MCP 安装命令与客户端配置生成器。
 *
 * 根据 MCP 的 endpoint 字段推断安装方式（npm / pip / docker / 远程 SSE），
 * 为不同客户端（Claude Desktop / Cursor / VS Code / Cline / 通用 CLI）
 * 生成可一键复制的配置或命令。
 */

export type McpClient =
  | "claude"
  | "cursor"
  | "vscode"
  | "cline"
  | "windsurf"
  | "cli";

export type InstallMethod = "npx" | "uvx" | "docker" | "remote" | "unknown";

export interface McpLike {
  slug: string;
  name: string;
  endpoint?: string;
  description?: string;
  /**
   * 探测脚本落库的安装方式（probe-mcp-install.mjs）。
   * 存在时优先生效；NULL/缺省时回退到下方启发式推断。
   */
  installMethod?: string | null;
  /** 探测落库的安装目标：npm 包名 / PyPI 包名 / 镜像名 / 远程 URL */
  installTarget?: string | null;
}

export interface McpInstallInfo {
  method: InstallMethod;
  /** 推断出的包名 / 镜像名 / 远程 URL */
  target: string;
  /** 是否需要额外的 env 配置（如 API Key） */
  needsEnv: boolean;
  /** 常见的环境变量名提示 */
  envHints: string[];
}

/**
 * 检测 MCP 是否需要配置环境变量（API Key 等）。
 * 使用精确正则而非简单子串，避免 "API" 一词导致全量误报。
 */
const ENV_PATTERNS = [
  /api[_-]?key/i,
  /api[_-]?token/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /secret[_-]?key/i,
  /requires.*(key|token|credential)/i,
  /set.*(api[_-]?key|token)/i,
  /your[_-]?(api[_-]?key|token)/i,
  /bearer/i,
  /openai[_-]?api/i,
  /anthropic[_-]?api/i,
  /github[_-]?token/i,
  /notion[_-]?token/i,
  /slack[_-]?token/i,
];

/**
 * 从 endpoint 推断 MCP 的安装方式与目标。
 *
 * endpoint 常见形态：
 *   github.com/owner/repo          → 尝试从 repo 名推断 npm/pip
 *   @scope/package                 → npm 包
 *   owner/package                  → npm 包（无 @）
 *   https://.../sse 或 /mcp        → 远程 SSE/HTTP
 *   docker.io/owner/image          → docker 镜像
 */
export function inferInstall(mcp: McpLike): McpInstallInfo {
  // 探测脚本落库的结果优先：与前端启发式相比是逐仓库验证过的事实
  const stored = mcp.installMethod;
  if (
    (stored === "npx" || stored === "uvx" || stored === "docker" || stored === "remote") &&
    mcp.installTarget
  ) {
    return {
      method: stored,
      target: mcp.installTarget,
      needsEnv: stored === "remote" ? false : detectNeedsEnv(mcp),
      envHints: stored === "remote" ? [] : guessEnvHints(mcp),
    };
  }
  if (stored === "unknown") {
    // 已探测但无标准安装方式（Go/Rust/monorepo 等），如实降级而非瞎猜
    return { method: "unknown", target: mcp.endpoint || mcp.slug, needsEnv: false, envHints: [] };
  }

  const raw = (mcp.endpoint ?? "").trim();
  const lower = raw.toLowerCase();

  // GitHub 仓库优先（应走 npx/uvx，而非 remote HTTP）
  if (lower.includes("github.com/")) {
    const repo = lower.split("github.com/")[1]?.split("/")[1]?.replace(/\.git$/, "") ?? "";
    if (repo) {
      // pip 包通常带 mcp-server- 前缀或 -mcp 后缀，且用下划线
      if (repo.startsWith("mcp-server-") || repo.endsWith("-mcp") || repo.includes("_")) {
        return {
          method: "uvx",
          target: repo,
          needsEnv: detectNeedsEnv(mcp),
          envHints: guessEnvHints(mcp),
        };
      }
      // 默认 npm
      return {
        method: "npx",
        target: repo,
        needsEnv: detectNeedsEnv(mcp),
        envHints: guessEnvHints(mcp),
      };
    }
  }

  // 远程 SSE / HTTP
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.includes("/sse") ||
    lower.includes("streamable")
  ) {
    return {
      method: "remote",
      target: raw,
      needsEnv: false,
      envHints: [],
    };
  }

  // Docker 镜像：已知镜像仓库前缀，或 name:tag 格式（非 npm 作用域包）
  const DOCKER_REGISTRIES = [
    "docker.io/",
    "ghcr.io/",
    "registry.",
    "quay.io/",
    "gcr.io/",
    "ecr.",
  ];
  if (
    DOCKER_REGISTRIES.some((r) => lower.startsWith(r)) ||
    (!raw.startsWith("@") && lower.includes(":") && lower.includes("/"))
  ) {
    return {
      method: "docker",
      target: raw,
      needsEnv: false,
      envHints: [],
    };
  }

  // npm 包（@scope/name 或 name）
  if (raw.startsWith("@") || /^[a-z0-9][a-z0-9-]*\/[a-z0-9-]+$/i.test(raw)) {
    return {
      method: "npx",
      target: raw,
      needsEnv: detectNeedsEnv(mcp),
      envHints: guessEnvHints(mcp),
    };
  }

  // 裸包名 → 默认 npm
  if (raw && /^[a-z0-9][a-z0-9-]*$/i.test(raw)) {
    return {
      method: "npx",
      target: raw,
      needsEnv: detectNeedsEnv(mcp),
      envHints: guessEnvHints(mcp),
    };
  }

  return {
    method: "unknown",
    target: raw || mcp.slug,
    needsEnv: false,
    envHints: [],
  };
}

function detectNeedsEnv(mcp: McpLike): boolean {
  const text = `${mcp.name} ${mcp.description ?? ""} ${mcp.endpoint ?? ""}`;
  return ENV_PATTERNS.some((p) => p.test(text));
}

function guessEnvHints(mcp: McpLike): string[] {
  const text = `${mcp.name} ${mcp.description ?? ""}`.toLowerCase();
  const hints: string[] = [];
  if (text.includes("openai")) hints.push("OPENAI_API_KEY");
  if (text.includes("anthropic") || text.includes("claude")) hints.push("ANTHROPIC_API_KEY");
  if (text.includes("github")) hints.push("GITHUB_TOKEN");
  if (text.includes("notion")) hints.push("NOTION_TOKEN");
  if (text.includes("slack")) hints.push("SLACK_BOT_TOKEN");
  if (text.includes("google") || text.includes("gemini")) hints.push("GOOGLE_API_KEY");
  if (hints.length === 0 && detectNeedsEnv(mcp)) hints.push("API_KEY");
  return hints;
}

/** 生成 npx 命令 */
function npxCommand(target: string): string {
  return `npx -y ${target}`;
}

/** 生成 uvx 命令 */
function uvxCommand(target: string): string {
  return `uvx ${target}`;
}

/** 生成 docker 命令 */
// 保持与其余命令生成器一致的 (target, name) 签名，name 本实现用不到
function dockerCommand(target: string, _name: string): string {
  return `docker run -i --rm ${target}`;
}

/**
 * 为指定客户端生成配置文本。
 * - claude / cursor / cline / windsurf：JSON 片段（mcpServers 格式）
 * - vscode：settings.json 片段
 * - cli：纯命令行
 */
export function generateConfig(
  mcp: McpLike,
  client: McpClient,
  info?: McpInstallInfo,
): string {
  const install = info ?? inferInstall(mcp);
  const key = mcp.slug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();

  // 远程 SSE/HTTP
  if (install.method === "remote") {
    if (client === "cli") {
      return `# 远程 MCP，在客户端配置中添加：\n# URL: ${install.target}`;
    }
    return JSON.stringify(
      {
        mcpServers: {
          [key]: {
            url: install.target,
          },
        },
      },
      null,
      2,
    );
  }

  // Docker
  if (install.method === "docker") {
    const cmd = dockerCommand(install.target, mcp.name);
    if (client === "cli") return cmd;
    return JSON.stringify(
      {
        mcpServers: {
          [key]: {
            command: "docker",
            args: ["run", "-i", "--rm", install.target],
            ...(install.needsEnv ? { env: envObject(install.envHints) } : {}),
          },
        },
      },
      null,
      2,
    );
  }

  // uvx (Python)
  if (install.method === "uvx") {
    if (client === "cli") return uvxCommand(install.target);
    return JSON.stringify(
      {
        mcpServers: {
          [key]: {
            command: "uvx",
            args: [install.target],
            ...(install.needsEnv ? { env: envObject(install.envHints) } : {}),
          },
        },
      },
      null,
      2,
    );
  }

  // npx (Node) — 默认
  if (client === "cli") return npxCommand(install.target);
  return JSON.stringify(
    {
      mcpServers: {
        [key]: {
          command: "npx",
          args: ["-y", install.target],
          ...(install.needsEnv ? { env: envObject(install.envHints) } : {}),
        },
      },
    },
    null,
    2,
  );
}

function envObject(hints: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const h of hints) {
    obj[h] = `your-${h.toLowerCase().replace(/_/g, "-")}-here`;
  }
  return obj;
}

/** 客户端元信息，用于渲染选择器 */
export const MCP_CLIENTS: {
  key: McpClient;
  label: string;
  desc: string;
}[] = [
  { key: "claude", label: "Claude Desktop", desc: "macOS 客户端" },
  { key: "cursor", label: "Cursor", desc: "AI 代码编辑器" },
  { key: "cline", label: "Cline", desc: "VS Code 插件" },
  { key: "windsurf", label: "Windsurf", desc: "AI IDE" },
  { key: "vscode", label: "VS Code", desc: "settings.json" },
  { key: "cli", label: "命令行", desc: "直接运行" },
];

/** 安装方式元信息 */
export const INSTALL_METHODS: {
  key: InstallMethod;
  label: string;
  command?: (target: string, name: string) => string;
}[] = [
  { key: "npx", label: "npx (Node)", command: (t) => npxCommand(t) },
  { key: "uvx", label: "uvx (Python)", command: (t) => uvxCommand(t) },
  { key: "docker", label: "Docker", command: (t, n) => dockerCommand(t, n) },
  { key: "remote", label: "远程 SSE/HTTP" },
  { key: "unknown", label: "手动配置" },
];
