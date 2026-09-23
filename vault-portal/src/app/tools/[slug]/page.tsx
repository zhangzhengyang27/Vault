import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ExternalLink } from "lucide-react";
import PhaseBadge from "@/components/PhaseBadge";
import FavoriteButton from "@/components/FavoriteButton";
import DetailLayout from "@/components/DetailLayout";
import ShareButton from "@/components/ShareButton";
import HistoryTracker from "@/components/HistoryTracker";
import LikeButton from "@/components/LikeButton";
import ReportButton from "@/components/ReportButton";
import { SITE_URL } from "@/lib/site";
import { safeExternalUrl } from "@/lib/safeUrl";

interface ApiTool {
  id: number;
  slug: string;
  name: string;
  description: string;
  content: string;
  website?: string | null;
  category?: { name: string } | null;
  tags: string[];
  rating: number;
  phase: string;
}

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/tools/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: "工具未找到" };
    const tool = (await res.json()) as ApiTool;
    return {
      title: `${tool.name}`,
      description: tool.description,
      alternates: { canonical: `${SITE_URL}/tools/${slug}` },
    };
  } catch {
    return { title: "工具详情" };
  }
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await fetch(`${API_BASE}/api/tools/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) notFound();

  const tool = (await res.json()) as ApiTool;

  // 获取相关推荐（同分类工具，排除当前工具）
  let relatedTools: ApiTool[] = [];
  try {
    const catName = tool.category?.name;
    if (catName) {
      const relatedRes = await fetch(
        `${API_BASE}/api/tools?category=${encodeURIComponent(catName)}&limit=6`,
        { next: { revalidate: 300 } },
      );
      if (relatedRes.ok) {
        const data = await relatedRes.json();
        const items = Array.isArray(data) ? data : data.items ?? [];
        relatedTools = items.filter((t: ApiTool) => t.slug !== tool.slug).slice(0, 4);
      }
    }
  } catch {
    /* ignore */
  }

  const main = (
    <>
      {/* 主信息卡：参考站文章式详情（logo + 标题 + 简介 + 正文） */}
      <div className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff]/90 to-[#69b1ff]/90 text-xl font-bold text-white">
            {tool.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
              {tool.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {tool.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tool.category?.name && (
                <Link
                  href={`/tools?category=${encodeURIComponent(tool.category.name)}`}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {tool.category.name}
                </Link>
              )}
              <PhaseBadge phase={tool.phase} />
              {tool.rating > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                  <Star size={12} fill="currentColor" /> {tool.rating}
                </span>
              )}
            </div>
          </div>
        </div>

        {safeExternalUrl(tool.website) && (
          <div className="mt-5">
            <a
              href={safeExternalUrl(tool.website) as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#1677ff] px-5 py-2 text-sm text-white transition hover:bg-[#4096ff]"
            >
              访问官网
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {tool.content && (
          <p className="mt-6 whitespace-pre-wrap border-t border-zinc-100 pt-5 text-base leading-7 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
            {tool.content}
          </p>
        )}

        {(tool.tags ?? []).length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            {(tool.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const sidebar = (
    <>
      {/* 工具推荐（参考站侧栏同款：名称 + 描述列表） */}
      {relatedTools.length > 0 && (
        <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            工具推荐
          </h3>
          <ul className="mt-3 space-y-3">
            {relatedTools.map((rt) => (
              <li key={rt.slug}>
                <Link href={`/tools/${rt.slug}`} className="group block">
                  <p className="truncate text-sm text-zinc-700 transition group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                    {rt.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {rt.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 操作卡 */}
      <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
        <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          操作
        </h3>
        <div className="space-y-2">
          <FavoriteButton targetType="tool" targetId={tool.id} />
          <LikeButton targetType="tool" targetId={tool.id} />
          <ShareButton title={tool.name} />
          <ReportButton targetType="tool" targetId={tool.id} targetTitle={tool.name} />
        </div>
      </div>

      {/* 元信息卡 */}
      <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
        <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          元信息
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">分类</dt>
            <dd className="font-medium text-zinc-700 dark:text-zinc-300">
              {tool.category?.name ?? "未分类"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">评分</dt>
            <dd className="flex items-center gap-1 font-medium text-amber-500">
              <Star size={12} fill="currentColor" /> {tool.rating}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">阶段</dt>
            <dd>
              <PhaseBadge phase={tool.phase} />
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">标签数</dt>
            <dd className="font-medium text-zinc-700 dark:text-zinc-300">
              {(tool.tags ?? []).length} 个
            </dd>
          </div>
        </dl>
      </div>
    </>
  );

  return (
    <>
      <HistoryTracker type="tool" slug={tool.slug} title={tool.name} path={`/tools/${tool.slug}`} />
      <DetailLayout
        breadcrumb={[
          { label: "AI 工具", href: "/tools" },
          { label: tool.name },
        ]}
        main={main}
        sidebar={sidebar}
      />
    </>
  );
}
