"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  List,
  Clock,
  Calendar,
  Newspaper,
  ExternalLink,
  Link2,
  Check,
  ArrowUp,
  X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import Pagination from "@/components/Pagination";
import { ChipRow } from "@/components/directory";
import { fetchAllList } from "@/lib/fetchList";
import { getNewsCategoryByKey } from "@/lib/newsMeta";
import { copyToClipboard } from "@/lib/clipboard";

interface ApiNews {
  slug: string;
  title: string;
  summary: string;
  time: string;
  category?: string | null;
  sourceUrl?: string | null;
  tags?: string[] | null;
}

interface CategoryCount {
  key: string;
  count: number;
}

type ViewMode = "list" | "timeline";

const PAGE_SIZE = 20;
/** 时间线单日默认展开条数，超出折叠 */
const DAY_COLLAPSE_COUNT = 5;

/**
 * 平滑滚动动画：rAF 驱动 + setInterval 兜底。
 * 部分 WebView（如 IAB 失焦时）会冻结 rAF，双通道保证任何环境都有动画；
 * 两条通道写同一位置是幂等的，先停的一方自动退出。返回取消函数。
 */
function animateScrollTo(targetY: number, duration = 800): () => void {
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 2) return () => {};
  const start = performance.now();
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let stopped = false;
  let raf = 0;
  const step = () => {
    if (stopped) return false;
    const p = Math.min(1, (performance.now() - start) / duration);
    window.scrollTo(0, startY + delta * ease(p));
    return p < 1;
  };
  raf = requestAnimationFrame(function loop() {
    if (!step()) {
      stopped = true;
      return;
    }
    raf = requestAnimationFrame(loop);
  });
  const iv = setInterval(() => {
    if (!step()) {
      stopped = true;
      clearInterval(iv);
    }
  }, 16);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    clearInterval(iv);
  };
}

function buildQuery(activeCat: string): URLSearchParams {
  const params = new URLSearchParams({ sort: "newest" });
  if (activeCat !== "all") params.set("category", activeCat);
  return params;
}

function NewsPageInner() {
  // 日期深链：/news?date=YYYY-MM-DD 直接以时间线视图打开并定位到该天
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [items, setItems] = useState<ApiNews[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState<ViewMode>(dateParam ? "timeline" : "list");
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [catCounts, setCatCounts] = useState<CategoryCount[]>([]);
  // 时间线单日折叠状态：记录已展开的日期
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  // 已复制分享链接的日期（用于 ✓ 反馈）
  const [copiedDate, setCopiedDate] = useState<string | null>(null);
  // 深链/日期选择定位后目标分组的高亮闪烁
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  // 已完成过定位的日期，避免 timeline 引用变化时重复滚动
  const lastScrolledDate = useRef<string | null>(null);
  // 进行中的滚动动画取消句柄（切换日期时打断旧动画）
  const cancelAnimRef = useRef<(() => void) | null>(null);

  // 分类筛选/分页全部下沉到服务端（category 在写入时已打标入库）
  useEffect(() => {
    if (view !== "list") return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const params = buildQuery(activeCat);
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        const res = await fetch(`/api/news?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setItems([]);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [view, page, activeCat]);

  // 时间线是全量视图：按日期分组需要完整集合，走全量拉取（同样走服务端筛选）
  const [timeline, setTimeline] = useState<ApiNews[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  useEffect(() => {
    if (view !== "timeline") return;
    const controller = new AbortController();
    (async () => {
      setTimelineLoading(true);
      try {
        const list = await fetchAllList<ApiNews>(
          `/api/news?${buildQuery(activeCat).toString()}`,
          { signal: controller.signal },
        );
        setTimeline(list);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setTimeline([]);
      } finally {
        if (!controller.signal.aborted) setTimelineLoading(false);
      }
    })();
    return () => controller.abort();
  }, [view, activeCat]);

  // 各分类已发布计数（后端聚合，chips 用）
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/news/categories", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCatCounts(Array.isArray(data) ? data : []))
      .catch(() => setCatCounts([]));
    return () => controller.abort();
  }, []);

  const updateFilter = (patch: { cat?: string }) => {
    if (patch.cat !== undefined) setActiveCat(patch.cat);
    setPage(1);
  };

  /** 分类 chips：再点已选分类回到全部（与原筛选行为一致） */
  const selectCat = (key: string) => {
    updateFilter({ cat: key === "all" || activeCat === key ? "all" : key });
  };

  /** 日期选择：写入 URL 与深链共用同一状态；选日期自动切到时间线定位查看 */
  const setDateFilter = (date: string | null) => {
    router.replace(date ? `/news?date=${date}` : "/news", { scroll: false });
    if (date) setView("timeline");
  };

  const goPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totalCount = catCounts.reduce((s, c) => s + c.count, 0);

  const chipItems = useMemo(
    () => [
      { key: "all", label: "全部", count: totalCount },
      ...catCounts.map((c) => ({
        key: c.key,
        label: getNewsCategoryByKey(c.key).label,
        count: c.count,
      })),
    ],
    [catCounts, totalCount],
  );

  // 时间线按日期分组：只认 YYYY-MM-DD，异常值统一归入「未知日期」垫底
  const grouped = useMemo(() => {
    const map = new Map<string, ApiNews[]>();
    for (const n of timeline) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(n.time) ? n.time : "未知日期";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(n);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "未知日期") return 1;
      if (b[0] === "未知日期") return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [timeline]);

  // 深链定位：时间线就绪后滚动到目标日期（该天在渲染时已强制展开）。
  // 平滑滚动会被 hydration 期间的滚动重置打断，故用瞬时定位 + 多次尝试兜底。
  // 深链定位：时间线就绪后平滑滚动到目标日期（该天在渲染时已强制展开）。
  // hydration 早期发起的滚动可能被打断，用一次延迟重试兜底；同一日期只滚一次。
  useEffect(() => {
    if (view !== "timeline" || timelineLoading || !dateParam) return;
    if (!timeline.some((n) => n.time === dateParam)) return;
    if (lastScrolledDate.current === dateParam) return;
    lastScrolledDate.current = dateParam;
    const scrollAndHighlight = () => {
      const el = document.getElementById(`news-date-${dateParam}`);
      if (!el) return true; // 元素未渲染，视为已处理
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.top <= window.innerHeight * 0.4) return true; // 已在视口
      // scroll-mt-20 的锚点偏移：为粘性日期头留出空间
      cancelAnimRef.current?.();
      cancelAnimRef.current = animateScrollTo(
        rect.top + window.scrollY - 80,
        900,
      );
      setHighlightDate(dateParam);
      return false;
    };
    scrollAndHighlight();
    const retry = setTimeout(scrollAndHighlight, 1000);
    const clearTimer = setTimeout(() => setHighlightDate(null), 2800);
    return () => {
      clearTimeout(retry);
      clearTimeout(clearTimer);
    };
  }, [view, timelineLoading, timeline, dateParam]);

  const toggleDay = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const shareDay = async (date: string) => {
    const url = `${window.location.origin}/news?date=${date}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedDate(date);
      setTimeout(() => setCopiedDate(null), 1500);
    }
  };

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
      <button
        onClick={() => setView("list")}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
          view === "list"
            ? "bg-[#1677ff] text-white"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
        }`}
      >
        <List size={13} /> 列表
      </button>
      <button
        onClick={() => setView("timeline")}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
          view === "timeline"
            ? "bg-[#1677ff] text-white"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
        }`}
      >
        <Clock size={13} /> 时间线
      </button>
    </div>
  );

  const dateFilter = (
    <div
      className={`flex items-center gap-1.5 rounded-lg border bg-white py-1.5 pl-3 pr-2 transition dark:bg-zinc-900 ${
        dateParam
          ? "border-[#1677ff] ring-2 ring-[#1677ff]/15 dark:border-[#5aa0ff] dark:ring-[#5aa0ff]/20"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
      } focus-within:border-[#1677ff] focus-within:ring-2 focus-within:ring-[#1677ff]/15 dark:focus-within:border-[#5aa0ff] dark:focus-within:ring-[#5aa0ff]/20`}
    >
      <Calendar
        size={14}
        className={dateParam ? "text-[#1677ff]" : "text-zinc-400"}
      />
      <input
        type="date"
        aria-label="按日期查看资讯"
        value={dateParam ?? ""}
        onChange={(e) => setDateFilter(e.target.value || null)}
        className="bg-transparent text-sm text-zinc-700 outline-none dark:text-zinc-300 dark:[color-scheme:dark]"
      />
      {dateParam && (
        <button
          onClick={() => setDateFilter(null)}
          title="清除日期"
          aria-label="清除日期"
          className="rounded-md p-0.5 text-zinc-400 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:hover:bg-[#5aa0ff]/10 dark:hover:text-[#5aa0ff]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  const resultMeta = (count: number) => (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        共 {count} 条结果
        {activeCat !== "all"
          ? ` · ${getNewsCategoryByKey(activeCat).label}`
          : ""}
      </p>
      {view === "timeline" && (
        <button
          onClick={() => {
            cancelAnimRef.current?.();
            cancelAnimRef.current = animateScrollTo(0, 600);
          }}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
        >
          <ArrowUp size={12} /> 回到最新
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 副标题（参考站同款），右侧为日期筛选 + 视图切换 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
            AI 资讯
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            追踪 AI 领域最新动态与行业观察，保持信息同步。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dateFilter}
          {viewToggle}
        </div>
      </div>

      {/* 分类 chips：灰底药丸，激活蓝底白字 */}
      <ChipRow items={chipItems} active={activeCat} onSelect={selectCat} />

      {view === "list" ? (
        loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Newspaper size={20} />}
            title="暂无资讯"
            description="正在努力收集中，敬请期待。"
            actionLabel={activeCat !== "all" ? "清除筛选条件" : undefined}
            onAction={() => {
              setActiveCat("all");
              setPage(1);
            }}
          />
        ) : (
          <>
            {resultMeta(total)}
            {/* 单列信息流：白卡 = 标题 + 摘要 + meta 行 */}
            <div className="space-y-3">
              {items.map((n) => {
                const cat = getNewsCategoryByKey(n.category ?? "industry");
                return (
                  <article
                    key={n.slug}
                    className="group relative rounded-lg bg-white p-4 transition hover:shadow-md dark:bg-zinc-900 sm:p-5"
                  >
                    <Link
                      href={`/news/${n.slug}`}
                      aria-label={n.title}
                      className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677ff]"
                    />
                    <h4 className="text-[17px] font-semibold leading-6 text-zinc-900 transition group-hover:text-[#1677ff] dark:text-zinc-50 dark:group-hover:text-[#5aa0ff]">
                      {n.title}
                    </h4>
                    {n.summary && (
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-zinc-500 dark:text-zinc-400">
                        {n.summary}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {cat.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                        <Clock size={11} /> {n.time}
                      </span>
                      {/* 有来源的条目可直接跳原文（stretched-link 模式下需 z-10） */}
                      {n.sourceUrl && (
                        <a
                          href={n.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-10 ml-auto inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500 dark:hover:text-[#5aa0ff]"
                        >
                          <ExternalLink size={11} /> 原文
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {totalPages > 1 && (
              <Pagination
                page={Math.min(page, totalPages)}
                totalPages={totalPages}
                onPageChange={goPage}
              />
            )}
          </>
        )
      ) : timelineLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : timeline.length === 0 ? (
        <EmptyState
          icon={<Newspaper size={20} />}
          title="暂无资讯"
          description="正在努力收集中，敬请期待。"
          actionLabel={activeCat !== "all" ? "清除筛选条件" : undefined}
          onAction={() => {
            setActiveCat("all");
            setPage(1);
          }}
        />
      ) : (
        <>
          {resultMeta(timeline.length)}
          {/* 所选日期无资讯时给出明确提示（其他日期可能仍有内容） */}
          {dateParam && !timeline.some((n) => n.time === dateParam) && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400">
              <Calendar size={13} className="shrink-0" />
              「{dateParam}」当天暂无资讯，可选择其他日期或清除日期查看全部。
              <button
                onClick={() => setDateFilter(null)}
                className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium underline-offset-2 hover:underline"
              >
                <X size={12} /> 清除日期
              </button>
            </div>
          )}
          {/* 时间线视图 */}
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#1677ff]/30 via-zinc-200 to-transparent dark:from-[#5aa0ff]/30 dark:via-zinc-700" />
            <div className="space-y-8">
              {grouped.map(([date, groupItems]) => {
                const isExpanded =
                  expandedDates.has(date) || date === dateParam;
                const visibleItems = isExpanded
                  ? groupItems
                  : groupItems.slice(0, DAY_COLLAPSE_COUNT);
                const hiddenCount = groupItems.length - visibleItems.length;
                return (
                  <div
                    key={date}
                    id={`news-date-${date}`}
                    className={`relative scroll-mt-20 pl-8 transition-colors duration-1000 ${
                      highlightDate === date
                        ? "rounded-lg bg-[#1677ff]/5 dark:bg-[#5aa0ff]/10"
                        : ""
                    }`}
                  >
                    <div className="absolute -left-[1px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#1677ff] dark:border-zinc-900">
                      <Calendar size={8} className="text-white" />
                    </div>
                    {/* 日期头：滚动时吸附在视口顶部，长时间线随时可见当前日期 */}
                    <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 rounded-lg bg-zinc-50/95 px-1 py-1.5 backdrop-blur-sm dark:bg-zinc-950/95">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {date}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {groupItems.length} 条
                      </span>
                      <button
                        onClick={() => shareDay(date)}
                        title={`复制 ${date} 的日报链接`}
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-400 transition hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
                      >
                        {copiedDate === date ? (
                          <>
                            <Check size={11} className="text-emerald-500" /> 已复制
                          </>
                        ) : (
                          <>
                            <Link2 size={11} /> 分享此日
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {visibleItems.map((n) => {
                        const cat = getNewsCategoryByKey(n.category ?? "industry");
                        return (
                          <div
                            key={n.slug}
                            className="group relative rounded-lg bg-white p-3 transition hover:shadow-sm dark:bg-zinc-900"
                          >
                            <Link
                              href={`/news/${n.slug}`}
                              aria-label={n.title}
                              className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677ff]"
                            />
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {cat.label}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-zinc-400">
                                <Clock size={11} /> {n.time}
                              </span>
                              {/* 有来源的条目可直接跳原文（stretched-link 模式下需 z-10） */}
                              {n.sourceUrl && (
                                <a
                                  href={n.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative z-10 ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500 dark:hover:text-[#5aa0ff]"
                                >
                                  <ExternalLink size={11} /> 原文
                                </a>
                              )}
                            </div>
                            <h4 className="mt-1.5 text-sm font-medium text-zinc-800 group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                              {n.title}
                            </h4>
                            {n.summary && (
                              <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {n.summary}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {/* 长日折叠：单日超过阈值默认收起，避免无限长滚动 */}
                      {hiddenCount > 0 && (
                        <button
                          onClick={() => toggleDay(date)}
                          className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 transition hover:border-[#1677ff]/40 hover:text-[#1677ff] dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-[#5aa0ff]/40 dark:hover:text-[#5aa0ff]"
                        >
                          展开其余 {hiddenCount} 条
                        </button>
                      )}
                      {isExpanded && groupItems.length > DAY_COLLAPSE_COUNT && (
                        <button
                          onClick={() => toggleDay(date)}
                          className="w-full rounded-lg py-1.5 text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          收起
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function NewsPage() {
  // useSearchParams 需要 Suspense 边界（静态预渲染约束）
  return (
    <Suspense fallback={null}>
      <NewsPageInner />
    </Suspense>
  );
}
