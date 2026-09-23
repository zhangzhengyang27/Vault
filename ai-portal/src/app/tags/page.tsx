"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Hash, TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";

interface TagCount {
  name: string;
  count: number;
  size: "sm" | "md" | "lg" | "xl";
}

/** 列表接口可能返回裸数组，也可能返回 { items: [...] } */
type ListResponse<T> = T[] | { items?: T[] };

/** 标签聚合只需要 tags 字段 */
interface TaggedItem {
  tags?: string[];
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 与全站一致走同源 /api（next rewrites 代理到后端），
        // 浏览器直连后端地址在部署环境会因跨域/HTTPS 混合内容失败
        const [toolsRes, promptsRes] = await Promise.all([
          fetch("/api/tools?limit=100").catch(() => null),
          fetch("/api/prompts?limit=100").catch(() => null),
        ]);

        const tagMap = new Map<string, number>();

        if (toolsRes?.ok) {
          const data: ListResponse<TaggedItem> = await toolsRes.json();
          const items = Array.isArray(data) ? data : data.items ?? [];
          items.forEach((t) => {
            (t.tags ?? []).forEach((tag) => {
              tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
            });
          });
        }

        if (promptsRes?.ok) {
          const data: ListResponse<TaggedItem> = await promptsRes.json();
          const items = Array.isArray(data) ? data : data.items ?? [];
          items.forEach((p) => {
            (p.tags ?? []).forEach((tag) => {
              tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
            });
          });
        }

        const sorted: TagCount[] = Array.from(tagMap.entries())
          .map(([name, count]) => ({
            name,
            count,
            size: (count >= 8 ? "xl" : count >= 5 ? "lg" : count >= 3 ? "md" : "sm") as TagCount["size"],
          }))
          .sort((a, b) => b.count - a.count);

        setTags(sorted);
      } catch {
        setTags([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
    xl: "text-lg px-3.5 py-2 font-semibold",
  };

  const popularTags = useMemo(() => tags.slice(0, 12), [tags]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <EmptyState
        icon={<Hash size={20} />}
        title="暂无标签"
        description="标签正在收集中，敬请期待。"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="标签云"
        description={`共收录 ${tags.length} 个标签，点击标签查看相关内容。`}
      />

      <div className="space-y-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {popularTags.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <TrendingUp size={15} className="text-rose-500" /> 热门标签
            </h2>
            <div className="flex flex-wrap gap-3">
              {popularTags.map((tag) => (
                <Link
                  key={tag.name}
                  href={`/search?q=${encodeURIComponent(tag.name)}`}
                  className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-blue-50 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-[#5aa0ff]/10 dark:hover:text-[#5aa0ff] ${sizeClasses[tag.size]}`}
                >
                  <Hash size={12} />
                  {tag.name}
                  <span className="text-xs opacity-60">{tag.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            全部标签
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                href={`/search?q=${encodeURIComponent(tag.name)}`}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 transition hover:bg-blue-50 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-[#5aa0ff]/10 dark:hover:text-[#5aa0ff]"
              >
                <Hash size={10} />
                {tag.name}
                <span className="text-zinc-400">{tag.count}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
