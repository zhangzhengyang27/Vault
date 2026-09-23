"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, Check, X, Minus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";

interface Tool {
  slug: string;
  name: string;
  description?: string;
  content?: string;
  tags?: string[];
  rating?: number;
  isFree?: boolean;
  requiresLogin?: boolean;
  qualityScore?: number;
  category?: { name: string } | null;
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-48 max-w-6xl" />}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const params = useSearchParams();
  const slugsParam = params.get("slugs") ?? "";
  // useMemo 让 slugs 的引用稳定，从而能安全地作为 effect 依赖
  // （否则每次渲染都是新数组，会导致 effect 反复触发）
  const slugs = useMemo(
    () => slugsParam.split(",").filter(Boolean),
    [slugsParam],
  );
  const [tools, setTools] = useState<(Tool | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (slugs.length === 0) {
        setLoading(false);
        return;
      }
      const results = await Promise.all(
        slugs.map((slug) =>
          fetch(`/api/tools/${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      setTools(results);
      setLoading(false);
    })();
  }, [slugs]);

  const validTools = useMemo(() => tools.filter(Boolean) as Tool[], [tools]);

  const rows = [
    {
      label: "分类",
      get: (t: Tool) => t.category?.name ?? "—",
    },
    {
      label: "免费",
      get: (t: Tool) =>
        t.isFree === true ? (
          <Check className="text-emerald-500" size={16} />
        ) : t.isFree === false ? (
          <X className="text-red-400" size={16} />
        ) : (
          <Minus className="text-zinc-300" size={16} />
        ),
    },
    {
      label: "需登录",
      get: (t: Tool) =>
        t.requiresLogin ? (
          <Check className="text-amber-500" size={16} />
        ) : (
          <X className="text-zinc-300" size={16} />
        ),
    },
    {
      label: "评分",
      get: (t: Tool) =>
        t.rating ? (
          <span className="inline-flex items-center gap-1">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {t.rating.toFixed(1)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "质量分",
      get: (t: Tool) => (t.qualityScore ?? "—"),
    },
    {
      label: "标签",
      get: (t: Tool) =>
        t.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {t.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(slugs.length, 3) }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (validTools.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-zinc-500 dark:text-zinc-400">
          请至少选择 2 个工具进行对比
        </p>
        <Link
          href="/tools"
          className="mt-4 inline-block rounded-lg bg-[#1677ff] px-4 py-2 text-sm text-white hover:bg-[#4096ff]"
        >
          去选择工具
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="工具对比"
        description="对比多个 AI 工具的分类、价格、评分、质量分等关键指标。"
      />

      {/* 对比表格 */}
      <div className="overflow-x-auto rounded-lg bg-white dark:bg-zinc-900">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="w-32 p-4 text-left text-xs font-medium uppercase text-zinc-400">
                对比项
              </th>
              {validTools.map((t) => (
                <th key={t.slug} className="p-4 text-left">
                  <Link
                    href={`/tools/${t.slug}`}
                    className="text-base font-bold text-zinc-900 hover:text-[#1677ff] dark:text-zinc-50 dark:hover:text-[#5aa0ff]"
                  >
                    {t.name}
                  </Link>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {t.description}
                    </p>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50"
              >
                <td className="p-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {row.label}
                </td>
                {validTools.map((t) => (
                  <td key={t.slug} className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                    {row.get(t)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                简介
              </td>
              {validTools.map((t) => (
                <td key={t.slug} className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
                  <p className="line-clamp-4 leading-relaxed">
                    {t.content || t.description || "暂无详细介绍"}
                  </p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
