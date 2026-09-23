import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Info, ExternalLink } from "lucide-react";
import DetailLayout from "@/components/DetailLayout";
import { SidebarCard, RankList } from "@/components/directory";
import ShareButton from "@/components/ShareButton";
import FavoriteButton from "@/components/FavoriteButton";
import HistoryTracker from "@/components/HistoryTracker";
import { extractNewsKeywords, getNewsCategoryByKey } from "@/lib/newsMeta";
import { SITE_URL } from "@/lib/site";

interface ApiNews {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  time: string;
  category?: string | null;
  sourceUrl?: string | null;
  tags?: string[] | null;
  phase?: string;
}

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/news/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: "资讯未找到" };
    const news = (await res.json()) as ApiNews;
    return {
      title: `${news.title}`,
      description: news.summary,
      alternates: { canonical: `${SITE_URL}/news/${slug}` },
    };
  } catch {
    return { title: "资讯详情" };
  }
}

/** 相关资讯：标题关键词重合 + 同日加权（轻量实现，无阅读计数依赖） */
async function fetchRelated(current: ApiNews): Promise<ApiNews[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news?sort=newest&limit=100`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: ApiNews[] };
    const keys = new Set(extractNewsKeywords(current.title));
    return (data.items ?? [])
      .filter((n) => n.slug !== current.slug)
      .map((n) => {
        const overlap = extractNewsKeywords(n.title).filter((k) =>
          keys.has(k),
        ).length;
        const score = overlap + (n.time === current.time ? 2 : 0);
        return { n, score };
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.n);  } catch {
    return [];
  }
}

/** 侧栏热门资讯：列表 API 取最新若干条，排除当前文章 */
async function fetchHotNews(currentSlug: string): Promise<ApiNews[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news?sort=newest&limit=9`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: ApiNews[] };
    return (data.items ?? [])
      .filter((n) => n.slug !== currentSlug)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await fetch(`${API_BASE}/api/news/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) notFound();

  const news = (await res.json()) as ApiNews;

  // content 列可空（采集队列中存在空正文条目），直接 split 会 500
  const paragraphs = (news.content ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const [related, hot] = await Promise.all([
    fetchRelated(news),
    fetchHotNews(news.slug),
  ]);
  const category = getNewsCategoryByKey(news.category ?? "industry");

  const main = (
    <>
      {/* 主文章卡：标题 + meta 行 + 摘要 + 正文 + 查看原文 */}
      <article className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
          {news.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
            <Clock size={12} /> {news.time}
          </span>
          <span className="text-xs text-zinc-300 dark:text-zinc-600">·</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {category.label}
          </span>
        </div>
        {news.summary && (
          <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {news.summary}
          </p>
        )}

        {paragraphs.length > 0 ? (
          <div className="mt-5 space-y-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-base leading-7 text-zinc-700 dark:text-zinc-200"
              >
                {para}
              </p>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-2 border-t border-zinc-100 pt-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <Info size={15} className="mt-0.5 shrink-0" />
            这条资讯暂无正文内容，可参考上方摘要。
          </div>
        )}

        {(news.tags ?? []).length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            {(news.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {news.sourceUrl && (
          <div className="mt-6">
            <a
              href={news.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#1677ff] px-5 py-2 text-sm text-white transition hover:bg-[#4096ff]"
            >
              查看原文
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </article>

      {/* 相关资讯 */}
      {related.length > 0 && (
        <section className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            相关资讯
          </h2>
          <ul className="mt-3 space-y-2.5">
            {related.map((r) => {
              const cat = getNewsCategoryByKey(r.category ?? "industry");
              return (
                <li key={r.slug}>
                  <Link
                    href={`/news/${r.slug}`}
                    className="group flex items-center gap-2.5"
                  >
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {cat.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-600 transition group-hover:text-[#1677ff] dark:text-zinc-300 dark:group-hover:text-[#5aa0ff]">
                      {r.title}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {r.time}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );

  const sidebar = (
    <>
      {/* 热门资讯：榜单（前 3 橙色序号） */}
      {hot.length > 0 && (
        <SidebarCard title="热门资讯">
          <RankList
            items={hot.map((n) => ({
              key: n.slug,
              href: `/news/${n.slug}`,
              title: n.title,
              countText: n.time,
            }))}
          />
        </SidebarCard>
      )}

      {/* 操作卡 */}
      <SidebarCard title="操作">
        <div className="mt-3 space-y-2">
          <FavoriteButton
            targetType="news"
            targetId={news.id}
            targetSlug={news.slug}
            title={news.title}
          />
          <ShareButton title={news.title} />
        </div>
      </SidebarCard>
    </>
  );

  return (
    <>
      <HistoryTracker type="news" slug={news.slug} title={news.title} path={`/news/${news.slug}`} />
      <DetailLayout
        breadcrumb={[
          { label: "AI 资讯", href: "/news" },
          { label: news.title },
        ]}
        main={main}
        sidebar={sidebar}
      />
    </>
  );
}
