"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Layers,
  FolderCog,
  HelpCircle,
  PackageOpen,
  MousePointerClick,
  RefreshCcw,
  Puzzle,
} from "lucide-react";
import { fetchAllList } from "@/lib/fetchList";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { ChipRow } from "@/components/directory";
import { CardGrid, ContentCard, CardTag, CardIcon } from "@/components/cards";
import { getMcpLogo } from "@/lib/mcpLogos";
import {
  SKILL_CATEGORIES,
  getSkillCategoryByKey,
} from "@/lib/skillMeta";

interface ApiSkill {
  slug: string;
  name: string;
  description?: string;
  endpoint?: string;
  type: string;
  tags?: string[];
  phase: string;
  createdAt: string;
}

const PAGE_SIZE = 12;

const FAQ_ITEMS = [
  {
    icon: Puzzle,
    q: "1. 什么是 Agent Skills？",
    a: "Agent Skills 是用来扩展 AI 编程助手能力的一种标准化功能模块，通常通过一个 SKILL.md 文件来说明使用规则和执行步骤，也可以附带脚本或模板作为辅助。2025 年 12 月，Anthropic 将 Agent Skills 的规范以开放标准的形式发布，随后 OpenAI 在 Codex CLI 和 ChatGPT 中采用了相同的格式。这意味着不同平台和工具可以复用同一套 Skills。",
  },
  {
    icon: FolderCog,
    q: "2. 如何安装 Skills？",
    a: "Claude Code：添加到 ~/.claude/skills/（个人）或 .claude/skills/（项目）。OpenAI Codex CLI：添加到 ~/.codex/skills/。两者使用相同的 SKILL.md 格式。克隆 GitHub 仓库并将 skill 文件夹复制到对应目录，AI 会自动发现并加载。Skills 不需要人工手动触发，而是由模型根据当前对话内容和任务上下文自动判断是否调用，以及如何调用。",
  },
  {
    icon: MousePointerClick,
    q: "3. Claude Skills 如何工作？",
    a: "通过统一的集成机制生效。安装后，这些技能会在对话过程中直接对 Claude 可用，Claude 在执行特定任务时按需读取和使用这些内容。整个运行过程由系统统一管理，在提升任务完成能力的同时，确保调用范围和行为符合既定的安全限制。",
  },
  {
    icon: Layers,
    q: "4. 我可以同时使用多个 Skills 吗？",
    a: "可以。Claude Code 支持同时使用多个技能。技能是模块化的，设计为可以协同工作。例如，你可以将文档处理类的技能与开发工具类的技能结合使用。Claude 会根据你的请求上下文智能选择合适的技能。",
  },
  {
    icon: RefreshCcw,
    q: "5. 如何获取最新的 Skills？",
    a: "本页面会定期更新 Skills 库，你可以收藏本页，确保能及时获得最新的 AI 工作流和编程技能分享。",
  },
  {
    icon: PackageOpen,
    q: "6. 我可以创建自己的 Skills 吗？",
    a: "可以。你可以使用官方存储库中的技能创建者指南，创建自定义 Agent Skill 并在 GitHub 上分享。许多开发者都会贡献他们的创作来帮助他人解决类似问题。",
  },
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<ApiSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"name" | "latest">("name");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 全量拉取：此前单次 limit=100，超出部分静默不可见
        setSkills(await fetchAllList<ApiSkill>("/api/mcps?type=skill"));
      } catch {
        setSkills([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 分类统计（基于 tags，按 SKILL_CATEGORIES 顺序）
  const catStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of skills) {
      for (const t of s.tags ?? []) {
        map.set(t, (map.get(t) ?? 0) + 1);
      }
    }
    return map;
  }, [skills]);

  const orderedCats = useMemo(
    () =>
      SKILL_CATEGORIES.filter((c) => (catStats.get(c.key) ?? 0) > 0).concat(
        Array.from(catStats.keys())
          .filter((k) => !SKILL_CATEGORIES.some((c) => c.key === k))
          .map((k) => getSkillCategoryByKey(k)),
      ),
    [catStats],
  );

  const filtered = useMemo(
    () =>
      skills.filter((s) => {
        if (activeCat !== "all" && !(s.tags ?? []).includes(activeCat)) {
          return false;
        }
        const kw = query.trim().toLowerCase();
        if (!kw) return true;
        return (
          s.name.toLowerCase().includes(kw) ||
          s.slug.toLowerCase().includes(kw) ||
          (s.description ?? "").toLowerCase().includes(kw) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(kw))
        );
      }),
    [skills, activeCat, query],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    if (sort === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else {
      // 「最新收录」按收录时间倒序；API 默认按 id ASC 返回，必须显式排序
      arr.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return arr;
  }, [filtered, sort]);
  const paged = useMemo(
    () => sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedFiltered, safePage],
  );

  // 筛选/排序变化统一走这里：立即重置页码，避免停留在超出结果的旧页
  const updateFilter = (patch: { cat?: string }) => {
    if (patch.cat !== undefined) setActiveCat(patch.cat);
    setPage(1);
  };

  const changeSort = (v: "name" | "latest") => {
    setSort(v);
    setPage(1);
  };

  const goPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const clearFilters = () => {
    updateFilter({ cat: "all" });
    setQ("");
    setQuery("");
  };

  const chipItems = [
    { key: "all", label: "全部", count: skills.length },
    ...orderedCats.map((c) => ({
      key: c.key,
      label: c.label,
      count: catStats.get(c.key) ?? 0,
    })),
  ];

  const utilityBtn = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
      active
        ? "bg-[#1677ff] text-white"
        : "bg-zinc-100 text-zinc-600 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300"
    }`;

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 副标题 + 搜索框（参考站 /tool 同款布局） */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
            Agent Skills 精选技能，即装即用
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            扩展 AI 编程助手能力的标准化模块：用一个 SKILL.md 定义规则与步骤，Claude
            Code 与 OpenAI Codex 已统一采用该格式，一份技能，处处可用。
          </p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
            setPage(1);
          }}
        >
          <div className="flex h-9 w-full min-w-56 items-center gap-2 rounded-md bg-zinc-100 px-3 dark:bg-zinc-800">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="在「Agent Skills」中搜索"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-[#1677ff] px-4 text-sm text-white transition hover:bg-[#4096ff]"
          >
            搜索
          </button>
        </form>
      </div>

      {/* 分类 chips（灰底药丸，激活蓝底白字） */}
      <ChipRow
        items={chipItems}
        active={activeCat}
        onSelect={(k) => updateFilter({ cat: k === activeCat ? "all" : k })}
      />

      {/* 排序 + 结果计数 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">排序</span>
          {(
            [
              ["name", "名称"],
              ["latest", "最新收录"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} onClick={() => changeSort(v)} className={utilityBtn(sort === v)}>
              {l}
            </button>
          ))}
        </div>
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            共 {filtered.length} 条结果
            {activeCat !== "all"
              ? ` · ${getSkillCategoryByKey(activeCat).label}`
              : ""}
          </p>
        )}
      </div>

      {/* 技能网格：统一大卡（图标 + 标题 + 标签 + 三行描述） */}
      {loading ? (
        <CardGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </CardGrid>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layers size={20} />}
          title="暂无 Skills"
          description="换个关键词或分类看看，正在努力收集中。"
          actionLabel={activeCat !== "all" || query ? "清除筛选条件" : undefined}
          onAction={clearFilters}
        />
      ) : (
        <CardGrid>
          {paged.map((s) => {
            const logo = getMcpLogo(s.slug);
            const cardTags = (s.tags ?? []).slice(0, 3);
            return (
              <ContentCard
                key={s.slug}
                href={`/skills/${s.slug}`}
                icon={
                  logo ? (
                    <CardIcon className="bg-white dark:bg-zinc-800">
                      <Image
                        src={logo}
                        alt={s.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain"
                      />
                    </CardIcon>
                  ) : (
                    <CardIcon className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm transition group-hover:shadow-md">
                      {s.name.charAt(0)}
                    </CardIcon>
                  )
                }
                title={s.name}
                tags={
                  cardTags.length > 0 ? (
                    <>
                      {cardTags.map((t) => (
                        <CardTag key={t}>{t}</CardTag>
                      ))}
                    </>
                  ) : (
                    <CardTag tone="zinc">{s.phase}</CardTag>
                  )
                }
                description={s.description}
              />
            );
          })}
        </CardGrid>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPageChange={goPage} />

      {/* FAQ 区块 */}
      <section className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-[#1677ff] dark:text-[#5aa0ff]" />
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              常见问题
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              关于 Agent Skills 的安装、使用与生态
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {FAQ_ITEMS.map((f) => (
            <div key={f.q} className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <f.icon
                  size={15}
                  className="shrink-0 text-[#1677ff] dark:text-[#5aa0ff]"
                />
                {f.q}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
