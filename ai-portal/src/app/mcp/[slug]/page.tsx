"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Copy,
  Check,
  Terminal,
  Settings2,
  KeyRound,
  Download,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PhaseBadge from "@/components/PhaseBadge";
import { McpLogo } from "@/components/McpLogo";
import { getMcpLogo } from "@/lib/mcpLogos";
import FavoriteButton from "@/components/FavoriteButton";
import LikeButton from "@/components/LikeButton";
import ReportButton from "@/components/ReportButton";
import CommentSection from "@/components/CommentSection";
import ShareButton from "@/components/ShareButton";
import HistoryTracker from "@/components/HistoryTracker";
import DetailLayout from "@/components/DetailLayout";
import { SidebarCard } from "@/components/directory";
import { fetchAllList } from "@/lib/fetchList";
import {
  inferCategory,
  getCategoryByKey,
  getMcpTags,
} from "@/lib/mcpMeta";
import { copyToClipboard } from "@/lib/clipboard";
import { useAuth } from "@/lib/auth";
import {
  inferInstall,
  generateConfig,
  INSTALL_METHODS,
  MCP_CLIENTS,
  type McpClient,
  type McpInstallInfo,
} from "@/lib/mcpInstall";

interface ApiMcp {
  id?: number;
  slug: string;
  name: string;
  description?: string;
  endpoint?: string;
  phase: string;
  createdAt: string;
  /** 探测脚本落库的安装方式,存在时 mcpInstall 优先采用 */
  installMethod?: string | null;
  installTarget?: string | null;
}

/** MCP 工具：inputSchema 是服务方返回的任意 JSON Schema，只在展示时序列化 */
interface McpTool {
  name: string;
  description: string;
  inputSchema?: unknown;
}

interface McpToolsResponse {
  tools?: McpTool[];
  note?: string;
}

export default function McpDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  // 工具探测是 admin-only 的服务端诊断接口，普通访客不发起请求
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [mcp, setMcp] = useState<ApiMcp | null>(null);
  const [related, setRelated] = useState<ApiMcp[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeClient, setActiveClient] = useState<McpClient>("claude");
  const [tools, setTools] = useState<McpTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsNote, setToolsNote] = useState("");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        // type=mcp:防止 skill 复用同一接口时被当 MCP 打开(/skills 页不传 type 不受影响)
        const res = await fetch(
          `/api/mcps/${encodeURIComponent(slug)}?type=mcp`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setMissing(true);
          return;
        }
        setMcp(await res.json());
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setMissing(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [slug]);

  // 同分类推荐（排除自身，最多 4 条；type=mcp 防止 skill 混入）
  useEffect(() => {
    if (!mcp) return;
    const catKey = inferCategory(mcp).key;
    const controller = new AbortController();
    (async () => {
      try {
        const all = await fetchAllList<ApiMcp>("/api/mcps?type=mcp", {
          signal: controller.signal,
        });
        const same = all.filter(
          (m) => m.slug !== mcp.slug && inferCategory(m).key === catKey,
        );
        setRelated(same.slice(0, 4));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setRelated([]);
      }
    })();
    return () => controller.abort();
  }, [mcp]);

  // 拉取 MCP 工具列表（仅管理员：探测端点会在服务端 spawn 进程，admin-only）
  useEffect(() => {
    if (!mcp || !isAdmin) return;
    void (async () => {
      setToolsLoading(true);
      setTools([]);
      setToolsNote("");
      try {
        const r = await fetch(
          `/api/mcps/${encodeURIComponent(mcp.slug)}/tools`,
        );
        const data: McpToolsResponse | null = r.ok ? await r.json() : null;
        if (data) {
          setTools(data.tools ?? []);
          if (data.note) setToolsNote(data.note);
        }
      } catch {
        // 拉取失败时保持空列表
      } finally {
        setToolsLoading(false);
      }
    })();
  }, [mcp, isAdmin]);

  // 推断安装方式
  const install: McpInstallInfo | null = useMemo(() => {
    if (!mcp) return null;
    return inferInstall(mcp);
  }, [mcp]);

  // 生成当前客户端的配置
  const configText = useMemo(() => {
    if (!mcp || !install) return "";
    return generateConfig(mcp, activeClient, install);
  }, [mcp, install, activeClient]);

  // 生成安装命令（CLI 模式）
  const installCmd = useMemo(() => {
    if (!mcp || !install) return "";
    return generateConfig(mcp, "cli", install);
  }, [mcp, install]);

  const handleCopyConfig = async () => {
    const ok = await copyToClipboard(configText);
    if (ok) {
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  };

  const handleCopyCmd = async () => {
    const ok = await copyToClipboard(installCmd);
    if (ok) {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    );
  }

  if (missing || !mcp) {
    return (
      <div className="rounded-lg bg-white py-20 text-center dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">服务未找到。</p>
        <Link
          href="/mcp"
          className="mt-4 inline-block text-sm font-medium text-[#1677ff] transition hover:text-[#4096ff] dark:text-[#5aa0ff]"
        >
          返回 MCP 服务
        </Link>
      </div>
    );
  }

  const cat = inferCategory(mcp);
  // getMcpTags 返回 [分类名, 品牌名?]，品牌药丸可点击回列表页触发 q 搜索
  const tags = getMcpTags(mcp);
  const brand = tags.length > 1 ? tags[1] : null;
  const methodLabel = install
    ? INSTALL_METHODS.find((m) => m.key === install.method)?.label
    : undefined;

  const copyBtn =
    "inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:text-[#1677ff] dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-[#5aa0ff]";

  const main = (
    <>
      {/* 主信息卡：参考站文章式详情（logo + 标题 + 简介 + 安装/端点） */}
      <div className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <div className="flex items-start gap-4">
          {getMcpLogo(mcp.slug) ? (
            <McpLogo slug={mcp.slug} name={mcp.name} size={56} />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff]/90 to-[#69b1ff]/90 text-xl font-bold text-white">
              {mcp.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
              {mcp.name}
            </h1>
            {mcp.description && (
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {mcp.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/mcp?cat=${cat.key}`}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-[#5aa0ff]/10 dark:hover:text-[#5aa0ff]"
              >
                {cat.label}
              </Link>
              {brand && (
                <Link
                  href={`/mcp?q=${encodeURIComponent(brand)}`}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-[#5aa0ff]/10 dark:hover:text-[#5aa0ff]"
                >
                  {brand}
                </Link>
              )}
              <PhaseBadge phase={mcp.phase} />
            </div>
          </div>
        </div>

        {mcp.endpoint && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              接入端点
            </p>
            <code className="block break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {mcp.endpoint}
            </code>
          </div>
        )}

        {/* ===== 一键安装区域（交互全部保留，样式接入设计系统） ===== */}
        {install && install.method !== "unknown" && (
          <div className="mt-6 space-y-5 rounded-md bg-zinc-100 p-4 dark:bg-zinc-800 sm:p-5">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-[#1677ff]" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                快速安装
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                {install.method === "npx"
                  ? "npx · Node.js"
                  : install.method === "uvx"
                    ? "uvx · Python"
                    : install.method === "docker"
                      ? "Docker"
                      : "远程 SSE/HTTP"}
              </span>
            </div>

            {/* 安装命令一键复制 */}
            {install.method !== "remote" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    安装命令
                  </p>
                  <button onClick={handleCopyCmd} className={copyBtn}>
                    {copiedCmd ? (
                      <>
                        <Check size={12} className="text-emerald-500" /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> 复制命令
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-md bg-white p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {installCmd}
                </pre>
              </div>
            )}

            {/* 环境变量提示 */}
            {install.needsEnv && install.envHints.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
                <KeyRound
                  size={14}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
                <div className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  <p className="font-medium">需要配置 API Key</p>
                  <p className="mt-0.5">
                    请在配置的{" "}
                    <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">
                      env
                    </code>{" "}
                    中填入：
                    {install.envHints.map((h, i) => (
                      <code
                        key={h}
                        className="ml-1 rounded bg-amber-100 px-1 font-mono dark:bg-amber-500/20"
                      >
                        {h}
                        {i < install.envHints.length - 1 ? "," : ""}
                      </code>
                    ))}
                  </p>
                </div>
              </div>
            )}

            {/* 客户端选择器 */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Settings2 size={13} className="text-zinc-400" />
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  选择客户端生成配置
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MCP_CLIENTS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveClient(c.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      activeClient === c.key
                        ? "bg-[#1677ff] text-white hover:bg-[#4096ff]"
                        : "bg-white text-zinc-600 hover:text-[#1677ff] dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 配置 JSON */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Terminal size={13} />{" "}
                  {MCP_CLIENTS.find((c) => c.key === activeClient)?.label} 配置
                </p>
                <button onClick={handleCopyConfig} className={copyBtn}>
                  {copiedConfig ? (
                    <>
                      <Check size={12} className="text-emerald-500" /> 已复制
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> 复制配置
                    </>
                  )}
                </button>
              </div>
              <pre className="max-h-80 overflow-auto rounded-md bg-white p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {configText}
              </pre>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                {activeClient === "claude" &&
                  "将配置粘贴到 Claude Desktop → Settings → Developer → Edit Config。"}
                {activeClient === "cursor" &&
                  "将配置粘贴到 Cursor → Settings → MCP → 手动添加，或写入 ~/.cursor/mcp.json。"}
                {activeClient === "cline" &&
                  "在 Cline 插件设置中找到 MCP 配置项，粘贴此 JSON。"}
                {activeClient === "windsurf" &&
                  "将配置粘贴到 Windsurf → Settings → MCP Servers。"}
                {activeClient === "vscode" &&
                  "在 VS Code settings.json 中添加 mcp.servers 配置项。"}
                {activeClient === "cli" &&
                  "在终端中直接运行此命令启动 MCP 服务器。"}
              </p>
            </div>
          </div>
        )}

        {/* 无法推断安装方式时的降级提示 */}
        {install && install.method === "unknown" && (
          <div className="mt-6 rounded-md bg-zinc-100 p-4 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              暂无法自动生成安装配置
            </p>
            <p className="mt-1 text-xs">
              请参考该 MCP 服务器的官方文档获取安装说明。
            </p>
          </div>
        )}

        {/* MCP 工具列表（探测为 admin-only 服务端诊断，访客视角该区块永远为空壳，整块隐藏） */}
        {isAdmin && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Wrench size={16} className="text-[#1677ff]" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                可用工具
              </h2>
              {tools.length > 0 && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {tools.length} 个
                </span>
              )}
            </div>

            {toolsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
                  />
                ))}
              </div>
            ) : tools.length > 0 ? (
              <div className="space-y-2">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="rounded-md bg-zinc-100 dark:bg-zinc-800"
                  >
                    <button
                      onClick={() =>
                        setExpandedTool(
                          expandedTool === tool.name ? null : tool.name,
                        )
                      }
                      className="flex w-full items-center justify-between p-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <code className="text-sm font-mono font-medium text-zinc-800 dark:text-zinc-200">
                          {tool.name}
                        </code>
                        {tool.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {tool.description}
                          </p>
                        )}
                      </div>
                      {expandedTool === tool.name ? (
                        <ChevronUp size={14} className="shrink-0 text-zinc-400" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-zinc-400" />
                      )}
                    </button>
                    {Boolean(expandedTool === tool.name && tool.inputSchema) && (
                      <div className="border-t border-zinc-200 px-3 pb-3 pt-2 dark:border-zinc-700">
                        <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-400 dark:text-zinc-500">
                          输入参数 Schema
                        </p>
                        <pre className="max-h-60 overflow-auto rounded-md bg-white p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                          {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-zinc-100 p-4 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {toolsNote ||
                  "暂未探测到工具列表。安装后在客户端（Claude/Cursor）中可查看完整工具列表。"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 评论区 */}
      {mcp.id && <CommentSection targetType="mcp" targetId={mcp.id} />}
    </>
  );

  const sidebar = (
    <>
      {/* 同分类推荐（参考站侧栏同款：名称 + 描述列表，hover 变蓝） */}
      {related.length > 0 && (
        <SidebarCard title={`更多${getCategoryByKey(cat.key).label}`}>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/mcp/${r.slug}`} className="group block">
                  <p className="truncate text-sm text-zinc-700 transition group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                    {r.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {r.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </SidebarCard>
      )}

      {/* 操作卡 */}
      <SidebarCard title="操作">
        <div className="mt-3 space-y-2">
          {mcp.id && (
            <>
              <FavoriteButton
                targetType="mcp"
                targetId={mcp.id}
                targetSlug={mcp.slug}
                title={mcp.name}
              />
              <LikeButton targetType="mcp" targetId={mcp.id} />
            </>
          )}
          <ShareButton title={mcp.name} />
          {mcp.id && (
            <ReportButton
              targetType="mcp"
              targetId={mcp.id}
              targetTitle={mcp.name}
            />
          )}
        </div>
      </SidebarCard>

      {/* 元信息卡 */}
      <SidebarCard title="元信息">
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">分类</dt>
            <dd className="font-medium text-zinc-700 dark:text-zinc-300">
              {cat.label}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">阶段</dt>
            <dd>
              <PhaseBadge phase={mcp.phase} />
            </dd>
          </div>
          {methodLabel && (
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">安装方式</dt>
              <dd className="font-medium text-zinc-700 dark:text-zinc-300">
                {methodLabel}
              </dd>
            </div>
          )}
          {mcp.createdAt && (
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">收录时间</dt>
              <dd className="font-medium text-zinc-700 dark:text-zinc-300">
                {new Date(mcp.createdAt).toLocaleDateString("zh-CN")}
              </dd>
            </div>
          )}
        </dl>
      </SidebarCard>
    </>
  );

  return (
    <>
      <HistoryTracker type="mcp" slug={mcp.slug} title={mcp.name} path={`/mcp/${mcp.slug}`} />
      <DetailLayout
        breadcrumb={[
          { label: "MCP 服务器", href: "/mcp" },
          { label: mcp.name },
        ]}
        main={main}
        sidebar={sidebar}
      />
    </>
  );
}
