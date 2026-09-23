import Link from "next/link";
import { relativeTime } from "@/lib/relativeTime";
import SearchTrigger from "@/components/SearchTrigger";
import { RankList, SidebarCard } from "@/components/directory";
import { CardGrid, ToolCard, PromptCard } from "@/components/cards";

interface ApiTool {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  rating: number;
  phase: string;
}

interface ApiPrompt {
  slug: string;
  title: string;
  description: string;
  category?: { name: string } | null;
  uses: number;
}

interface ApiNews {
  slug: string;
  title: string;
  summary: string;
  time: string;
}

interface ApiRepo {
  slug: string;
  name: string;
  description: string;
  stars: string;
}

interface ApiPost {
  id: number;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
}

const HOT_KEYWORDS = ["ChatGPT", "提示词", "绘画", "MCP", "RAG", "周报"];

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`${label}加载失败 (${res.status})`);
  return res.json();
}

/** 区块标题行：h2 + 右侧“查看更多”（参考站同款） */
function SectionBar({
  title,
  href,
  action = "查看更多",
}: {
  title: string;
  href: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <Link
        href={href}
        className="text-sm text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500 dark:hover:text-[#5aa0ff]"
      >
        {action}
      </Link>
    </div>
  );
}

export default async function HomePage() {
  // 各板块独立容错：单个接口故障只降级对应板块，不再让整页崩溃；
  // 构建/预渲染阶段后端不可用时页面以空板块呈现，运行期由 ISR 自动刷新。
  const [toolsRes, promptsRes, newsRes, reposRes, postsRes] =
    await Promise.allSettled([
      fetchJson<{ items?: ApiTool[] } | ApiTool[]>(`${API_BASE}/api/tools`, "工具数据"),
      fetchJson<{ items?: ApiPrompt[] } | ApiPrompt[]>(`${API_BASE}/api/prompts`, "提示词数据"),
      fetchJson<{ items?: ApiNews[] } | ApiNews[]>(`${API_BASE}/api/news`, "资讯数据"),
      fetchJson<{ items?: ApiRepo[] } | ApiRepo[]>(`${API_BASE}/api/repos`, "开源项目数据"),
      fetchJson<{ items?: ApiPost[] }>(`${API_BASE}/api/posts?sort=hot&limit=5`, "社区数据"),
    ]);

  const unwrap = <T,>(r: PromiseSettledResult<T>): T | null =>
    r.status === "fulfilled" ? r.value : null;

  const t = unwrap(toolsRes);
  const p = unwrap(promptsRes);
  const n = unwrap(newsRes);
  const r = unwrap(reposRes);
  const c = unwrap(postsRes);

  const tools: ApiTool[] = (Array.isArray(t) ? t : t?.items ?? []) as ApiTool[];
  const prompts: ApiPrompt[] = (Array.isArray(p) ? p : p?.items ?? []) as ApiPrompt[];
  const news: ApiNews[] = (Array.isArray(n) ? n : n?.items ?? []) as ApiNews[];
  const repos: ApiRepo[] = (Array.isArray(r) ? r : r?.items ?? []) as ApiRepo[];
  const posts: ApiPost[] = c?.items ?? [];

  const featured = [...tools]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Hero：居中大标题 + 全站搜索（参考站同款） */}
      <section className="pt-8 text-center sm:pt-14">
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          探索 AI，从这里开始
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
          分享最新最有趣的 AI 工具、资源、信息，打造最强 AI 社区
        </p>
        <div className="mt-7">
          <SearchTrigger />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-zinc-400 dark:text-zinc-500">
          <span>热门搜索：</span>
          {HOT_KEYWORDS.map((k) => (
            <Link
              key={k}
              href={`/tools?q=${encodeURIComponent(k)}`}
              className="transition hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
            >
              {k}
            </Link>
          ))}
        </div>
      </section>

      {/* 精选推荐：高评分工具（渐变封面卡） */}
      {featured.length > 0 && (
        <section>
          <SectionBar title="精选推荐" href="/tools" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {featured.map((t, i) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="group overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-md dark:bg-zinc-900"
              >
                <div
                  className={`flex h-24 items-center justify-center text-3xl font-extrabold text-white/90 ${
                    [
                      "bg-gradient-to-br from-[#1677ff] to-[#69b1ff]",
                      "bg-gradient-to-br from-violet-500 to-fuchsia-400",
                      "bg-gradient-to-br from-emerald-500 to-teal-400",
                      "bg-gradient-to-br from-orange-500 to-amber-400",
                      "bg-gradient-to-br from-rose-500 to-pink-400",
                    ][i % 5]
                  }`}
                >
                  {t.name[0]}
                </div>
                <div className="p-3">
                  <h3 className="truncate text-[15px] font-medium text-zinc-900 group-hover:text-[#1677ff] dark:text-zinc-50 dark:group-hover:text-[#5aa0ff]">
                    {t.name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {t.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* AI 工具大全：统一大卡网格 */}
      {tools.length > 0 && (
        <section>
          <SectionBar title="AI 工具大全" href="/tools" />
          <CardGrid>
            {tools.slice(0, 8).map((t) => (
              <ToolCard
                key={t.slug}
                tool={{
                  slug: t.slug,
                  name: t.name,
                  desc: t.description,
                  tags: t.tags ?? [],
                  rating: t.rating,
                  phase: t.phase,
                }}
              />
            ))}
          </CardGrid>
        </section>
      )}

      {/* 双栏：左（社区 + 提示词） 右（资讯榜 + 开源榜） */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-10">
          {/* AI 交流社区 */}
          {posts.length > 0 && (
            <section>
              <SectionBar title="AI 交流社区" href="/community" action="更多" />
              <div className="space-y-3">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white">
                        {post.authorName[0] ?? "?"}
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {post.authorName}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        · {relativeTime(post.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[15px] font-medium leading-snug">
                      <Link
                        href={`/community/${post.id}`}
                        className="text-zinc-900 transition hover:text-[#1677ff] dark:text-zinc-50 dark:hover:text-[#5aa0ff]"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    {post.content && (
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                        {post.content}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* 提示词 */}
          {prompts.length > 0 && (
            <section>
              <SectionBar title="AI 提示词" href="/prompts" />
              <CardGrid>
                {prompts.slice(0, 4).map((pr) => (
                  <PromptCard
                    key={pr.slug}
                    prompt={{
                      slug: pr.slug,
                      title: pr.title,
                      desc: pr.description,
                      category: pr.category?.name ?? "未分类",
                      author: "",
                      uses: pr.uses ?? 0,
                      phase: "v1",
                    }}
                  />
                ))}
              </CardGrid>
            </section>
          )}
        </div>

        {/* 右栏榜单 */}
        <aside className="hidden w-[300px] shrink-0 space-y-4 lg:block">
          {news.length > 0 && (
            <SidebarCard title="🌟 AI 资讯" action={
              <Link
                href="/news"
                className="text-xs text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500"
              >
                更多
              </Link>
            }>
              <RankList
                items={news.slice(0, 8).map((item) => ({
                  key: item.slug,
                  href: `/news/${item.slug}`,
                  title: item.title,
                }))}
              />
            </SidebarCard>
          )}
          {repos.length > 0 && (
            <SidebarCard title="🔥 热门开源" action={
              <Link
                href="/github"
                className="text-xs text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500"
              >
                更多
              </Link>
            }>
              <RankList
                items={repos.slice(0, 8).map((item) => ({
                  key: item.slug,
                  href: `/github/${item.slug}`,
                  title: item.name,
                  countText: `⭐ ${item.stars}`,
                }))}
              />
            </SidebarCard>
          )}
        </aside>
      </div>
    </div>
  );
}
