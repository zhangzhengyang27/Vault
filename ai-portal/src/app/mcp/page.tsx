"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { McpLogo } from "@/components/McpLogo";
import { getMcpLogo } from "@/lib/mcpLogos";
import {
  Plug,
  HelpCircle,
  Cpu,
  Package,
  ShieldCheck,
  MousePointerClick,
  ListChecks,
  Copy,
  Check,
} from "lucide-react";
import { fetchAllList } from "@/lib/fetchList";
import { DirectoryHeader, ChipRow } from "@/components/directory";
import { CardGrid, ContentCard, CardTag, CardIcon } from "@/components/cards";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import {
  MCP_CATEGORIES,
  inferCategory,
  getCategoryByKey,
} from "@/lib/mcpMeta";
import { inferInstall, generateConfig } from "@/lib/mcpInstall";
import { copyToClipboard } from "@/lib/clipboard";

interface ApiMcp {
  slug: string;
  name: string;
  description: string;
  endpoint: string;
  tags?: string[] | null;
  phase: string;
  createdAt: string;
}

const PAGE_SIZE = 12;

const FAQ_ITEMS = [
  {
    icon: HelpCircle,
    q: "1. 什么是 MCP 服务器？",
    a: "MCP（Model Context Protocol，模型上下文协议）服务器是连接 AI 助手（如 Claude、Cursor 等）与外部数据源、API 及服务的工具。它们使 AI 模型能够获取实时信息、执行代码、与数据库交互，并实现超越其基础能力范围的操作。",
  },
  {
    icon: Cpu,
    q: "2. MCP 服务器是如何工作的？",
    a: "MCP 服务器充当人工智能助手与外部系统之间的中介。当您要求 AI 执行需要外部数据的任务时，MCP 服务器会处理请求，获取所需数据，并将其转换为人工智能能够理解和使用的格式返回。",
  },
  {
    icon: Package,
    q: "3. MCP 服务器能提供什么？",
    a: "MCP 服务器可实现各类资源的共享（包括文件、文档、数据），开放各类工具能力（如 API 集成、操作指令调用），还能提供标准化的交互提示模板；服务器端可自主管控自有资源，同时为保障安全，会搭建清晰的系统边界，做到权限与隔离可控。",
  },
  {
    icon: ShieldCheck,
    q: "4. MCP 服务器安全吗？",
    a: "是的，MCP 协议内置了完善的安全机制。服务器能够独立管理自身资源，因此无需向大型语言模型提供商共享 API 密钥，整个系统界限清晰。每个服务器均自行负责身份验证和访问控制，确保操作安全隔离。",
  },
  {
    icon: MousePointerClick,
    q: "5. 如何在 Cursor 中安装 MCP 服务器？",
    a: "要在 Cursor 中安装 MCP 服务器：1) 打开 Cursor 设置（Cmd+,），2) 导航至 MCP 服务器部分，3) 点击「添加服务器」，4) 输入服务器配置（名称和命令），5) 重启 Cursor。",
  },
  {
    icon: ListChecks,
    q: "6. 如何选择合适的 MCP 服务器？",
    a: "建议您重点关注以下几个方面：1）兼容性：确保服务器能与您常用的编辑器顺畅协作；2）匹配应用场景：根据您的具体需求，选择为此类任务专门设计的服务器；3）关注维护状态：优先选择正在活跃维护、并有近期更新记录的服务器，这通常意味着更可靠；4）参考社区热度：GitHub 上较高的星标数和频繁的提交更新往往是项目质量和受欢迎程度的体现。",
  },
];

export default function McpPage() {
  // useSearchParams 需要在 Suspense 边界内使用（静态预渲染时降级为骨架屏）
  return (
    <Suspense
      fallback={
        <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      }
    >
      <McpListContent />
    </Suspense>
  );
}

function McpListContent() {
  // mcps：全量语料（分类 chips 的计数依据）；searchState：搜索激活时由后端 q 参数返回的子集
  const sp = useSearchParams();
  const initialCat = sp.get("cat");
  const initialQ = sp.get("q")?.trim() ?? "";

  const [mcps, setMcps] = useState<ApiMcp[]>([]);
  const [searchState, setSearchState] = useState<{
    query: string;
    items: ApiMcp[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState(
    initialCat && MCP_CATEGORIES.some((x) => x.key === initialCat)
      ? initialCat
      : "all",
  );
  const [page, setPage] = useState(1);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<"name" | "latest">("name");
  const [q, setQ] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);

  const handleQuickCopy = async (e: React.MouseEvent, m: ApiMcp) => {
    e.preventDefault();
    e.stopPropagation();
    const cmd = generateConfig(m, "cli", inferInstall(m));
    const ok = await copyToClipboard(cmd);
    if (ok) {
      setCopiedSlug(m.slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // 全量拉取：此前单次 limit=100，超出部分静默不可见
        const items = await fetchAllList<ApiMcp>("/api/mcps?type=mcp");
        setMcps(items);
      } catch {
        setMcps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 搜索接线：后端 /api/mcps 支持 q 参数（name/description 模糊匹配），全量取回后走同一套筛选/排序/分页管线
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const items = await fetchAllList<ApiMcp>(
          `/api/mcps?type=mcp&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        setSearchState({ query, items });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!controller.signal.aborted) setSearchState({ query, items: [] });
      }
    })();
    return () => controller.abort();
  }, [query]);

  // 分类统计（始终基于全量语料，与搜索词无关，参考站行为一致）
  const catStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mcps) {
      const key = inferCategory(m).key;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [mcps]);

  const chips = useMemo(() => {
    const withCounts = MCP_CATEGORIES.filter((c) => (catStats.get(c.key) ?? 0) > 0).map(
      (c) => ({ key: c.key, label: c.label, count: catStats.get(c.key) ?? 0 }),
    );
    return [{ key: "all", label: "全部", count: mcps.length }, ...withCounts];
  }, [catStats, mcps]);

  // 搜索激活时展示后端 q 检索结果；结果未就绪（或与当前词不匹配）前视为加载中
  const searched =
    searchState && searchState.query === query ? searchState.items : null;
  const corpus = useMemo(() => (query ? searched ?? [] : mcps), [query, searched, mcps]);
  const listLoading = loading || (Boolean(query) && searched === null);

  const filtered = useMemo(
    () =>
      corpus.filter(
        (m) => activeCat === "all" || inferCategory(m).key === activeCat,
      ),
    [corpus, activeCat],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    if (sort === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else {
      // 「最新收录」按 createdAt 倒序;此前该分支为空,实际展示的是 id 升序(最早在前)
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return arr;
  }, [filtered, sort]);
  const paged = useMemo(
    () => sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedFiltered, safePage],
  );

  const goPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 分类变化时回到第一页（此前经 useEffect 异步重置，已改为事件内直接处理）
  const updateFilter = (patch: { cat?: string }) => {
    if (patch.cat !== undefined) setActiveCat(patch.cat);
    setPage(1);
  };

  const selectCat = (key: string) =>
    updateFilter({ cat: activeCat === key ? "all" : key });

  const submitSearch = () => {
    const v = q.trim();
    setQ(v);
    setQuery(v);
    setPage(1);
  };

  const clearFilters = () => {
    updateFilter({ cat: "all" });
    setQ("");
    setQuery("");
  };

  const utilityBtn = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] transition ${
      active
        ? "bg-[#1677ff] text-white"
        : "bg-zinc-100 text-zinc-600 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300"
    }`;

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 副标题 + 搜索框（后端 q 参数） */}
      <DirectoryHeader
        title="发现全球好用的 MCP 服务器"
        subtitle="MCP（Model Context Protocol）让智能体通过标准化工具调用协议连接外部服务与数据源：搜索、读写数据库、浏览器自动化……一次接入，处处可用。"
        searchValue={q}
        searchPlaceholder="搜索 MCP 服务器"
        onSearchChange={setQ}
        onSearchSubmit={submitSearch}
      >
        <div className="mt-4 space-y-3">
          {/* 分类 chips */}
          <ChipRow items={chips} active={activeCat} onSelect={selectCat} />

          {/* 排序 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">排序</span>
            {(
              [
                ["name", "名称"],
                ["latest", "最新收录"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} onClick={() => setSort(v)} className={utilityBtn(sort === v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </DirectoryHeader>

      {/* 卡片列表：统一大卡（图标 + 标题 + 标签 + 三行描述） */}
      {listLoading ? (
        <CardGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </CardGrid>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Plug size={20} />}
          title={query ? "没有找到匹配的 MCP 服务器" : "暂无 MCP 服务器"}
          description={
            query
              ? "换个关键词，或清除筛选条件后再试试。"
              : "正在努力收集中，敬请期待。"
          }
          actionLabel={activeCat !== "all" || query ? "清除筛选条件" : undefined}
          onAction={clearFilters}
        />
      ) : (
        <>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            共 {filtered.length} 条结果
            {query ? ` · “${query}”` : ""}
            {activeCat !== "all"
              ? ` · ${getCategoryByKey(activeCat).label}`
              : ""}
          </p>
          <CardGrid>
            {paged.map((m) => {
              const install = inferInstall(m);
              const canCopy =
                install.method !== "unknown" && install.method !== "remote";
              const cardTags = (m.tags ?? []).slice(0, 3);
              return (
                <div key={m.slug} className="group relative">
                  <ContentCard
                    href={`/mcp/${m.slug}`}
                    icon={
                      getMcpLogo(m.slug) ? (
                        <McpLogo slug={m.slug} name={m.name} size={48} />
                      ) : (
                        <CardIcon className="bg-gradient-to-br from-[#1677ff] to-violet-500 text-white shadow-sm transition group-hover:shadow-md">
                          <Plug size={22} />
                        </CardIcon>
                      )
                    }
                    title={m.name}
                    tags={
                      cardTags.length > 0 ? (
                        <>
                          {cardTags.map((t) => (
                            <CardTag key={t}>{t}</CardTag>
                          ))}
                        </>
                      ) : (
                        <CardTag tone="zinc">{m.phase}</CardTag>
                      )
                    }
                    description={m.description}
                    action={
                      canCopy && (
                        <button
                          onClick={(e) => handleQuickCopy(e, m)}
                          className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-zinc-400 ring-1 ring-zinc-200 backdrop-blur transition hover:text-[#1677ff] hover:ring-[#1677ff]/40 lg:opacity-0 lg:group-hover:opacity-100 dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-zinc-700 dark:hover:text-[#5aa0ff] dark:hover:ring-[#5aa0ff]/40"
                          title="复制安装命令"
                          aria-label="复制安装命令"
                        >
                          {copiedSlug === m.slug ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      )
                    }
                  />
                </div>
              );
            })}
          </CardGrid>

          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={goPage}
            />
          )}
        </>
      )}

      {/* 常见问题 */}
      <section className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <HelpCircle size={18} className="text-[#1677ff]" />
          常见问题
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          MCP（Model Context Protocol）基础概念与接入指南
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.q}
              className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-800"
            >
              <h3 className="flex items-start gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1677ff]/10 text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
                  <item.icon size={14} />
                </span>
                {item.q}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
