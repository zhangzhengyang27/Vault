"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ListItem from "@/components/ListItem";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { fetchAllList } from "@/lib/fetchList";

interface ApiResource {
  slug: string;
  title: string;
  type: string;
  description: string;
  phase: string;
  sourceUrl?: string | null;
}

// 内容迁移导入的爬取文章统一改标为「视频教程」，在默认浏览态单独分区排在精选之后
const VIDEO_TYPE = "视频教程";

export default function ResourcesPage() {
  const [resources, setResources] = useState<ApiResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 全量拉取：默认 limit 只有 12，绝大部分数据此前根本不展示
        setResources(await fetchAllList<ApiResource>("/api/resources"));
      } catch {
        setResources([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 类型 chips + 计数（48 条数据量小，客户端统计即可）；视频教程排到最后
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of resources) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return [...map.entries()].sort(
      (a, b) => (a[0] === VIDEO_TYPE ? 1 : 0) - (b[0] === VIDEO_TYPE ? 1 : 0),
    );
  }, [resources]);

  const keyword = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      resources.filter((r) => {
        if (activeType !== "all" && r.type !== activeType) return false;
        if (
          keyword &&
          !`${r.title} ${r.description}`.toLowerCase().includes(keyword)
        )
          return false;
        return true;
      }),
    [resources, activeType, keyword],
  );

  // 默认浏览态按「精选 / 视频教程」分区；筛选或搜索时平铺
  const browsing = activeType === "all" && !keyword;
  const curated = filtered.filter((r) => r.type !== VIDEO_TYPE);
  const videos = filtered.filter((r) => r.type === VIDEO_TYPE);

  const renderGrid = (items: ApiResource[]) => (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((r) => (
        <ListItem
          key={r.slug}
          href={`/resources/${r.slug}`}
          icon={<GraduationCap size={18} />}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          title={r.title}
          description={r.description}
          meta={
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {r.type}
            </span>
          }
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 学习资源"
        description="精选课程、教程、书籍与官方文档，助你系统进阶。"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} />}
          title="暂无学习资源"
          description="正在努力收集中，敬请期待。"
        />
      ) : (
        <>
          {/* 类型筛选 + 站内搜索（后端支持 type/q，数据量小直接客户端过滤） */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveType("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeType === "all"
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                全部 {resources.length}
              </button>
              {typeCounts.map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    activeType === type
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {type} {count}
                </button>
              ))}
            </div>
            <div className="relative sm:ml-auto sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索资源…"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={20} />}
              title="没有匹配的资源"
              description="换个关键词或类型试试。"
            />
          ) : browsing ? (
            <div className="space-y-8">
              {curated.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    精选学习资源
                  </h2>
                  {renderGrid(curated)}
                </section>
              )}
              {videos.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    视频教程
                  </h2>
                  {renderGrid(videos)}
                </section>
              )}
            </div>
          ) : (
            renderGrid(filtered)
          )}
        </>
      )}
    </div>
  );
}
