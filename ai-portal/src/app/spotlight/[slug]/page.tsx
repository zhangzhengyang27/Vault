"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Wrench, MessageSquare, Plug, ExternalLink, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSpotlight, SPOTLIGHTS } from "@/lib/spotlights";
import Skeleton from "@/components/Skeleton";
import ShareButton from "@/components/ShareButton";
import HistoryTracker from "@/components/HistoryTracker";
import DetailLayout from "@/components/DetailLayout";
import { SidebarCard, RankList } from "@/components/directory";

/** 详情卡片的统一形状（由策划数据或搜索补充映射而来） */
interface CardItem {
  name: string;
  desc: string;
  href: string;
  /** 附加徽标文本，如工具评分 */
  badge?: string;
}

function SpotlightSection({
  title,
  icon: Icon,
  list,
  moreHref,
}: {
  title: string;
  icon: LucideIcon;
  list: CardItem[];
  moreHref: string;
}) {
  return (
    <section className="rounded-lg bg-white p-5 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <Icon size={16} className="text-[#1677ff] dark:text-[#5aa0ff]" />
          {title}
          <span className="text-xs font-normal text-zinc-400">({list.length})</span>
        </h2>
        <Link
          href={moreHref}
          className="shrink-0 text-[13px] text-[#1677ff] transition hover:text-[#4096ff] dark:text-[#5aa0ff] dark:hover:text-[#4096ff]"
        >
          查看全部 →
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="mt-3 rounded-lg bg-zinc-100 p-4 text-center text-xs text-zinc-400 dark:bg-zinc-800">
          暂无相关内容，持续收集中
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {list.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-2 rounded-lg bg-zinc-100 p-3 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-800 group-hover:text-[#1677ff] dark:text-zinc-100 dark:group-hover:text-[#5aa0ff]">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <Star size={9} className="fill-current" /> {item.badge}
                    </span>
                  )}
                </p>
                {item.desc && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.desc}
                  </p>
                )}
              </div>
              <ExternalLink size={12} className="mt-1 shrink-0 text-zinc-400 dark:text-zinc-500" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

interface RawTool {
  slug: string;
  name: string;
  description?: string;
  rating?: number;
}
interface RawPrompt {
  slug: string;
  title: string;
  description?: string;
}
interface RawMcp {
  slug: string;
  name: string;
  description?: string;
}
interface SearchResult {
  type: string;
  name: string;
  desc: string;
  slug: string;
  href: string;
}

export default function SpotlightDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const spotlight = getSpotlight(slug);
  const [tools, setTools] = useState<CardItem[]>([]);
  const [prompts, setPrompts] = useState<CardItem[]>([]);
  const [mcps, setMcps] = useState<CardItem[]>([]);
  const [searchExtra, setSearchExtra] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!spotlight) return;
    let cancelled = false;

    (async () => {
      // 策划清单按 slug 拉取真实数据（allSettled 兜底个别 404 不拖垮整页）
      const [toolResults, promptResults, mcpResults, searchRes] =
        await Promise.all([
          Promise.all(spotlight.tools.map((s) => fetchJson<RawTool>(`/api/tools/${encodeURIComponent(s)}`))),
          Promise.all(spotlight.prompts.map((s) => fetchJson<RawPrompt>(`/api/prompts/${encodeURIComponent(s)}`))),
          Promise.all(spotlight.mcps.map((s) => fetchJson<RawMcp>(`/api/mcps/${encodeURIComponent(s)}`))),
          // 搜索作为"更多相关"补充
          fetchJson<SearchResult[]>(
            `/api/search?q=${encodeURIComponent(
              spotlight.title.replace(/工具箱|全套|套件|工作台|灵感库|指南|专家/, "").trim(),
            )}`,
          ),
        ]);
      if (cancelled) return;

      const toolCards: CardItem[] = toolResults
        .filter((t): t is RawTool => !!t)
        .map((t) => ({
          name: t.name,
          desc: t.description ?? "",
          href: `/tools/${t.slug}`,
          badge: t.rating && t.rating > 0 ? t.rating.toFixed(1) : undefined,
        }));
      const promptCards: CardItem[] = promptResults
        .filter((p): p is RawPrompt => !!p)
        .map((p) => ({
          name: p.title?.trim() || p.slug,
          desc: p.description ?? "",
          href: `/prompts/${p.slug}`,
        }));
      const mcpCards: CardItem[] = mcpResults
        .filter((m): m is RawMcp => !!m)
        .map((m) => ({
          name: m.name,
          desc: m.description ?? "",
          href: `/mcp/${m.slug}`,
        }));

      // 搜索补充：剔除已在策划清单中的条目，避免重复
      const seen = new Set([...toolCards, ...promptCards, ...mcpCards].map((c) => c.href));
      const extra = (Array.isArray(searchRes) ? searchRes : [])
        .filter((i) => !seen.has(i.href))
        .slice(0, 6)
        .map((i) => ({ name: i.name, desc: i.desc, href: i.href }));

      setTools(toolCards);
      setPrompts(promptCards);
      setMcps(mcpCards);
      setSearchExtra(extra);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [spotlight]);

  if (!spotlight) {
    return (
      <div className="rounded-lg bg-white py-16 text-center dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">专题不存在</p>
        <Link
          href="/spotlight"
          className="mt-4 inline-block text-sm text-[#1677ff] transition hover:text-[#4096ff]"
        >
          返回专题列表
        </Link>
      </div>
    );
  }

  // 各区块「查看全部」统一落到全站搜索并带上专题关键词（/search 页支持 ?q=）
  const keyword = encodeURIComponent(
    spotlight.title.replace(/工具箱|全套|套件|工作台|灵感库|指南|专家/, "").trim(),
  );

  const main = (
    <>
      {/* 标题卡：文章式详情（渐变圆标 + 28px 标题 + meta + 正文） */}
      <section className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff]/90 to-[#69b1ff]/90 text-2xl text-white">
            {spotlight.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
              {spotlight.title}
            </h1>
            <p className="mt-2 text-[13px] text-zinc-400 dark:text-zinc-500">
              {spotlight.tools.length} 个工具 · {spotlight.prompts.length} 个提示词 ·{" "}
              {spotlight.mcps.length} 个 MCP
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {spotlight.description}
            </p>
          </div>
        </div>
        {spotlight.intro && (
          <p className="mt-5 whitespace-pre-wrap border-t border-zinc-100 pt-5 text-base leading-7 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
            {spotlight.intro}
          </p>
        )}
      </section>

      {loading ? (
        <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-24 last:mb-0" />
          ))}
        </div>
      ) : (
        <>
          <SpotlightSection title="推荐工具" icon={Wrench} list={tools} moreHref={`/search?q=${keyword}`} />
          <SpotlightSection title="精选提示词" icon={MessageSquare} list={prompts} moreHref={`/search?q=${keyword}`} />
          <SpotlightSection title="MCP 服务器" icon={Plug} list={mcps} moreHref={`/search?q=${keyword}`} />
          {searchExtra.length > 0 && (
            <SpotlightSection title="更多相关" icon={Sparkles} list={searchExtra} moreHref={`/search?q=${keyword}`} />
          )}
        </>
      )}
    </>
  );

  // 侧栏：其他专题推荐（RankList 榜单样式）
  const others = SPOTLIGHTS.filter((s) => s.slug !== spotlight.slug);

  const sidebar = (
    <>
      <SidebarCard title="其他专题">
        <RankList
          items={others.map((s) => ({
            key: s.slug,
            href: `/spotlight/${s.slug}`,
            title: s.title,
            countText: `${s.tools.length} 个工具`,
          }))}
        />
      </SidebarCard>

      {/* 操作卡 */}
      <SidebarCard title="操作">
        <div className="mt-3">
          <ShareButton title={spotlight.title} />
        </div>
      </SidebarCard>
    </>
  );

  return (
    <>
      <HistoryTracker type="spotlight" slug={spotlight.slug} title={spotlight.title} path={`/spotlight/${spotlight.slug}`} />
      <DetailLayout
        breadcrumb={[
          { label: "场景专题", href: "/spotlight" },
          { label: spotlight.title },
        ]}
        main={main}
        sidebar={sidebar}
      />
    </>
  );
}
