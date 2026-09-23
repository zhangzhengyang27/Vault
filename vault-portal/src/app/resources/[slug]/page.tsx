import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import ShareButton from "@/components/ShareButton";
import FavoriteButton from "@/components/FavoriteButton";
import HistoryTracker from "@/components/HistoryTracker";

interface ApiResource {
  id: number;
  slug: string;
  title: string;
  type?: string;
  description?: string;
  phase: string;
  createdAt: string;
  sourceUrl?: string | null;
}

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** 详情页与相关推荐共用同一份全量列表，避免重复请求 */
async function fetchResource(slug: string) {
  const res = await fetch(`${API_BASE}/api/resources/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { resource: null, related: [] as ApiResource[] };
  const resource = (await res.json()) as ApiResource;

  // 相关资源：同类型优先，不足 4 条用其余资源补齐（排除自身）
  const related: ApiResource[] = [];
  try {
    const listRes = await fetch(`${API_BASE}/api/resources?limit=100`, {
      next: { revalidate: 300 },
    });
    if (listRes.ok) {
      const data = (await listRes.json()) as { items?: ApiResource[] };
      const items = (data.items ?? []).filter((r) => r.slug !== slug);
      const sameType = items.filter((r) => r.type && r.type === resource.type);
      const others = items.filter((r) => !sameType.includes(r));
      related.push(...[...sameType, ...others].slice(0, 4));
    }
  } catch {
    // 相关推荐失败不影响主内容
  }
  return { resource, related };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/resources/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: "资源未找到" };
    const resource = (await res.json()) as ApiResource;
    return {
      title: `${resource.title}`,
      description: resource.description,
    };
  } catch {
    return { title: "学习资源详情" };
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { resource, related } = await fetchResource(slug);
  if (!resource) notFound();

  // 外链展示用域名，完整地址在链接本身
  let sourceHost = "";
  if (resource.sourceUrl) {
    try {
      sourceHost = new URL(resource.sourceUrl).host;
    } catch {
      sourceHost = resource.sourceUrl;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <HistoryTracker type="resource" slug={resource.slug} title={resource.title} path={`/resources/${resource.slug}`} />
      {/* 面包屑 */}
      <nav className="flex items-center gap-1.5 text-sm text-zinc-400">
        <Link href="/resources" className="hover:text-indigo-500 transition">
          学习资源
        </Link>
        <ChevronRight size={14} className="shrink-0" />
        <span className="truncate font-medium text-zinc-600 dark:text-zinc-300">
          {resource.title}
        </span>
      </nav>

      {/* 标题区 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {resource.title}
              </h1>
              {resource.type && (
                <span className="mt-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {resource.type}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FavoriteButton
              targetType="resource"
              targetId={resource.id}
              targetSlug={resource.slug}
              title={resource.title}
            />
            <ShareButton title={resource.title} />
          </div>
        </div>

        {resource.description && (
          <p className="mt-5 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
            {resource.description}
          </p>
        )}

        {resource.createdAt && (
          <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
            收录于 {new Date(resource.createdAt).toLocaleDateString("zh-CN")}
          </p>
        )}
      </div>

      {/* 官方地址：课程/文档/书籍的跳转出口 */}
      {resource.sourceUrl && (
        <a
          href={resource.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
              <ExternalLink size={13} /> 官方地址
            </p>
            <p className="mt-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              前往学习：{sourceHost}
            </p>
          </div>
          <ArrowRight
            size={18}
            className="shrink-0 text-indigo-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
          />
        </a>
      )}

      {/* 相关资源：同类型优先 */}
      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            相关资源
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/resources/${r.slug}`}
                className="group flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-400">
                    {r.title}
                  </p>
                  {r.type && (
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      {r.type}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={15}
                  className="shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-400 dark:text-zinc-600"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
