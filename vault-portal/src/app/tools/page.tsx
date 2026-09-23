"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChipRow } from "@/components/directory";
import { CardGrid, ToolCard } from "@/components/cards";
import Skeleton from "@/components/Skeleton";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { GitCompare, X, Check } from "lucide-react";

interface ApiTool {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  rating: number;
  phase: string;
  category?: { name: string } | null;
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

const PAGE_SIZE = 12;

export default function ToolsPage() {
  const [tools, setTools] = useState<ApiTool[]>([]);
  const [cats, setCats] = useState<{ key: string; label: string; count: number }[]>([]);
  const [cat, setCat] = useState("全部");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [sort, setSort] = useState<"rating" | "newest" | "name">("rating");
  const [freeOnly, setFreeOnly] = useState(false);

  const toggleCompare = (slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 4) return prev;
      return [...prev, slug];
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedSlugs([]);
  };

  useEffect(() => {
    fetch("/api/categories?kind=tool")
      .then((r) => r.json())
      .then((list) => {
        const arr: ApiCategory[] = Array.isArray(list) ? list : [];
        // 后端只返回有工具内容的分类并附带计数;空分类不再平铺
        const withCounts = arr.map((c) => ({
          key: c.name,
          label: c.name,
          count: (c as ApiCategory & { count?: number }).count ?? 0,
        }));
        setCats([
          { key: "全部", label: "全部", count: withCounts.reduce((s, c) => s + c.count, 0) },
          ...withCounts,
        ]);
      })
      .catch(() => setCats([{ key: "全部", label: "全部", count: 0 }]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (cat !== "全部") params.set("category", cat);
        if (freeOnly) params.set("free", "true");
        if (query) params.set("q", query);
        // 排序由服务端执行：跨页顺序一致，客户端只排当前页没有意义
        params.set("sort", sort);
        const res = await fetch(`/api/tools?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setTools(Array.isArray(data) ? data : data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setTools([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [cat, page, freeOnly, sort, query]);

  function selectCat(c: string) {
    setCat(c);
    setPage(1);
  }

  function toggleFree() {
    setFreeOnly((prev) => !prev);
    setPage(1);
  }

  const utilityBtn = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
      active
        ? "bg-[#1677ff] text-white"
        : "bg-zinc-100 text-zinc-600 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300"
    }`;

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 副标题 + 搜索框（参考站 /tool 同款） */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
            AI 工具网站应用大全
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            收录优质 AI 生产力工具，按分类快速筛选你需要的产品
          </p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
            setPage(1);
          }}
        >
          <div className="flex h-9 w-full min-w-56 items-center gap-2 rounded-md bg-zinc-100 px-3 dark:bg-zinc-800">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="在「AI工具」中搜索"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-[#1677ff] px-4 text-sm text-white transition hover:bg-[#4096ff]"
          >
            搜索
          </button>
        </form>
      </div>

      {/* 分类 chips */}
      <ChipRow items={cats} active={cat} onSelect={selectCat} />

      {/* 工具行：排序 / 免费筛选 / 对比 */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["rating", "评分最高"],
            ["newest", "最新"],
            ["name", "名称"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => {
              setSort(v);
              setPage(1);
            }}
            className={utilityBtn(sort === v)}
          >
            {l}
          </button>
        ))}
        <button onClick={toggleFree} className={utilityBtn(freeOnly)}>
          <Check size={12} className={freeOnly ? "" : "opacity-0"} />
          仅看免费
        </button>
        <button
          onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
          className={utilityBtn(compareMode)}
        >
          <GitCompare size={13} />
          {compareMode ? "退出对比" : "对比工具"}
        </button>
      </div>

      {/* 工具网格：统一大卡（图标 + 标题 + 标签 + 三行描述） */}
      {loading ? (
        <CardGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </CardGrid>
      ) : tools.length === 0 ? (
        <EmptyState
          title="没有找到匹配的工具"
          description="换个关键词或分类看看，或提交你发现的优质 AI 工具。"
          actionLabel="提交工具"
          actionHref="/submit"
        />
      ) : (
        <CardGrid>
          {tools.map((t) => (
            <div key={t.slug} className="relative">
              <ToolCard
                tool={{
                  slug: t.slug,
                  name: t.name,
                  desc: t.description,
                  tags: t.tags ?? [],
                  rating: t.rating,
                  phase: t.phase,
                }}
              />
              {compareMode && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCompare(t.slug);
                  }}
                  className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 transition ${
                    selectedSlugs.includes(t.slug)
                      ? "border-[#1677ff] bg-[#1677ff] text-white"
                      : "border-zinc-300 bg-white/80 text-transparent hover:border-[#1677ff] dark:border-zinc-600 dark:bg-zinc-800/80"
                  }`}
                  title={selectedSlugs.includes(t.slug) ? "取消选择" : "加入对比"}
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </CardGrid>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* 对比模式浮动栏 */}
      {compareMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                已选 {selectedSlugs.length}/4
              </span>
              <div className="flex gap-1.5">
                {selectedSlugs.map((slug) => {
                  const tool = tools.find((t) => t.slug === slug);
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1677ff]/10 px-2.5 py-1 text-xs text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]"
                    >
                      {tool?.name ?? slug}
                      <button onClick={() => toggleCompare(slug)}>
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
                {selectedSlugs.length === 0 && (
                  <span className="text-xs text-zinc-400">点击卡片右上角勾选工具</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exitCompareMode}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <Link
                href={selectedSlugs.length >= 2 ? `/tools/compare?slugs=${selectedSlugs.join(",")}` : "#"}
                className={`rounded-md px-4 py-1.5 text-sm font-medium text-white transition ${
                  selectedSlugs.length >= 2
                    ? "bg-[#1677ff] hover:bg-[#4096ff]"
                    : "cursor-not-allowed bg-zinc-300 dark:bg-zinc-700"
                }`}
                onClick={(e) => {
                  if (selectedSlugs.length < 2) e.preventDefault();
                }}
              >
                开始对比
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
