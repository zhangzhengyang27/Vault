"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, Star } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { ChipRow } from "@/components/directory";
import { CardGrid, ContentCard, CardTag, CardIcon } from "@/components/cards";
import { fetchAllList } from "@/lib/fetchList";

interface ApiRepo {
  slug: string;
  name: string;
  description: string;
  stars: string;
  lang: string;
  phase: string;
  createdAt?: string;
}

type SortKey = "stars" | "newest" | "name";

// stars 字段形如 "102k"/"9.6k"，转成可比较数值；stars 是字符串列，
// 服务端 SQL 排序会得到字典序（"9.6k" > "200.7k"），必须在前端解析后排序
function parseStars(stars?: string): number {
  const m = /^([\d.]+)\s*k$/i.exec((stars ?? "").trim());
  if (m) return parseFloat(m[1]) * 1000;
  const n = parseFloat((stars ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const SORTS: [SortKey, string][] = [
  ["stars", "热度最高"],
  ["newest", "最新收录"],
  ["name", "名称"],
];

export default function GithubPage() {
  const [repos, setRepos] = useState<ApiRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("全部");
  const [sort, setSort] = useState<SortKey>("stars");

  useEffect(() => {
    (async () => {
      try {
        // 全量拉取：默认 limit 只有 12，绝大部分数据此前根本不展示
        setRepos(await fetchAllList<ApiRepo>("/api/repos"));
      } catch {
        setRepos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 语言 chips 按内容聚合（带计数）；Unknown/空语言不设 chip，但「全部」下仍可见
  const langs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of repos) {
      const l = (r.lang ?? "").trim();
      if (!l || l === "Unknown") continue;
      counts.set(l, (counts.get(l) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [repos]);

  const filtered = useMemo(() => {
    const list = repos.filter((r) => {
      if (lang !== "全部" && (r.lang ?? "").trim() !== lang) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "stars") return parseStars(b.stars) - parseStars(a.stars);
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [repos, lang, sort]);

  function selectLang(l: string) {
    setLang(l);
  }

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 副标题（codefather 列表页同款排版） */}
      <div>
        <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
          GitHub 开源
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          精选优质开源项目，紧跟 AI 开源生态脉搏。
        </p>
      </div>

      {/* 筛选区：排序 chips → 语言 chips */}
      {!loading && repos.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">排序</span>
            <ChipRow
              items={SORTS.map(([v, l]) => ({ key: v, label: l }))}
              active={sort}
              onSelect={(k) => setSort(k as SortKey)}
            />
          </div>
          <ChipRow
            items={[
              { key: "全部", label: "全部", count: repos.length },
              ...langs.map((c) => ({ key: c.name, label: c.name, count: c.count })),
            ]}
            active={lang}
            onSelect={selectLang}
          />
        </div>
      )}

      {loading ? (
        <CardGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </CardGrid>
      ) : repos.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={20} />}
          title="暂无开源项目"
          description="正在努力收集中，敬请期待。"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={20} />}
          title="没有匹配的开源项目"
          description="换个语言筛选试试。"
        />
      ) : (
        <CardGrid>
          {filtered.map((r) => (
            <ContentCard
              key={r.slug}
              href={`/github/${r.slug}`}
              icon={
                <CardIcon className="bg-gradient-to-br from-zinc-600 to-zinc-800 text-white shadow-sm transition group-hover:shadow-md">
                  <GitBranch size={22} />
                </CardIcon>
              }
              title={r.name}
              tags={
                <>
                  {r.lang && <CardTag>{r.lang}</CardTag>}
                  {r.stars && (
                    <CardTag tone="zinc">
                      <Star size={11} className="text-amber-500" fill="currentColor" />
                      {r.stars}
                    </CardTag>
                  )}
                </>
              }
              description={r.description}
            />
          ))}
        </CardGrid>
      )}
    </div>
  );
}
