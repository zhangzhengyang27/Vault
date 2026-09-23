import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import PhaseBadge from "@/components/PhaseBadge";
import FavoriteButton from "@/components/FavoriteButton";
import ShareButton from "@/components/ShareButton";
import HistoryTracker from "@/components/HistoryTracker";
import DetailLayout from "@/components/DetailLayout";
import { SidebarCard } from "@/components/directory";
import { SITE_URL } from "@/lib/site";

interface ApiRepo {
  id: number;
  slug: string;
  name: string;
  description?: string;
  stars?: string;
  lang?: string;
  phase: string;
  createdAt: string;
}

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** 数据模型无独立 url 字段：owner/repo 形态直接拼 GitHub 地址，其余退化为站内搜索 */
function repoUrl(name: string): string {
  const n = name.trim();
  if (n.includes("/")) return `https://github.com/${n}`;
  return `https://github.com/search?q=${encodeURIComponent(n)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/repos/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: "仓库未找到" };
    const repo = (await res.json()) as ApiRepo;
    return {
      title: `${repo.name}`,
      description: repo.description,
      alternates: { canonical: `${SITE_URL}/github/${slug}` },
    };
  } catch {
    return { title: "开源项目详情" };
  }
}

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await fetch(`${API_BASE}/api/repos/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) notFound();

  const repo = (await res.json()) as ApiRepo;

  // 同类项目推荐：同语言优先，无同语言时回退到热度最高的其他项目
  let relatedRepos: ApiRepo[] = [];
  try {
    const listRes = await fetch(`${API_BASE}/api/repos?limit=100&sort=stars`, {
      next: { revalidate: 300 },
    });
    if (listRes.ok) {
      const data = await listRes.json();
      const items = (Array.isArray(data) ? data : data.items ?? []) as ApiRepo[];
      const lang = (repo.lang ?? "").trim();
      const pool = items.filter((r) => r.slug !== repo.slug);
      const sameLang = lang
        ? pool.filter((r) => (r.lang ?? "").trim() === lang)
        : [];
      relatedRepos = (sameLang.length > 0 ? sameLang : pool).slice(0, 5);
    }
  } catch {
    /* ignore */
  }

  const main = (
    <div className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff]/90 to-[#69b1ff]/90 text-xl font-bold text-white">
          {repo.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
            {repo.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {repo.stars && (
              <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                <Star size={13} fill="currentColor" /> {repo.stars}
              </span>
            )}
            {repo.lang && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-400">
                {repo.lang}
              </span>
            )}
            <PhaseBadge phase={repo.phase} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <a
          href={repoUrl(repo.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#1677ff] px-5 py-2 text-sm text-white transition hover:bg-[#4096ff]"
        >
          访问仓库
          <ExternalLink size={14} />
        </a>
      </div>

      {repo.description && (
        <p className="mt-6 whitespace-pre-wrap border-t border-zinc-100 pt-5 text-base leading-7 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
          {repo.description}
        </p>
      )}

      {repo.createdAt && (
        <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
          收录于 {new Date(repo.createdAt).toLocaleDateString("zh-CN")}
        </p>
      )}
    </div>
  );

  const sidebar = (
    <>
      {/* 同类项目推荐 */}
      {relatedRepos.length > 0 && (
        <SidebarCard title="同类项目推荐">
          <ul className="mt-3 space-y-3">
            {relatedRepos.map((rt) => (
              <li key={rt.slug}>
                <Link
                  href={`/github/${rt.slug}`}
                  className="group flex items-baseline justify-between gap-2"
                >
                  <span className="min-w-0 truncate text-sm text-zinc-700 transition group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                    {rt.name}
                  </span>
                  {rt.stars && (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                      <Star size={10} fill="currentColor" /> {rt.stars}
                    </span>
                  )}
                </Link>
                {rt.description && (
                  <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {rt.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SidebarCard>
      )}

      {/* 操作卡 */}
      <SidebarCard title="操作">
        <div className="mt-3 space-y-2">
          <FavoriteButton
            targetType="repo"
            targetId={repo.id}
            targetSlug={repo.slug}
            title={repo.name}
          />
          <ShareButton title={repo.name} />
        </div>
      </SidebarCard>
    </>
  );

  return (
    <>
      <HistoryTracker type="github" slug={repo.slug} title={repo.name} path={`/github/${repo.slug}`} />
      <DetailLayout
        breadcrumb={[
          { label: "GitHub 开源", href: "/github" },
          { label: repo.name },
        ]}
        main={main}
        sidebar={sidebar}
      />
    </>
  );
}
