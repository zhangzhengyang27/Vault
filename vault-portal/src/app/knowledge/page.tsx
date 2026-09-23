"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Compass } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { DirectoryGrid, DirectoryCard } from "@/components/directory";

interface KnowledgeBase {
  name: string;
  count: number;
  lastUpdated: string;
  description?: string | null;
  isPath?: boolean;
  categories?: string[];
}

const AVATAR_GRADIENTS = [
  "from-[#1677ff]/90 to-[#69b1ff]/90",
  "from-violet-500/90 to-fuchsia-400/90",
  "from-emerald-500/90 to-teal-400/90",
  "from-orange-500/90 to-amber-400/90",
  "from-rose-500/90 to-pink-400/90",
  "from-cyan-500/90 to-sky-400/90",
];

export default function KnowledgePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/articles/knowledge-bases");
        const data = await res.json();
        setBases(Array.isArray(data) ? data : []);
      } catch {
        setBases([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 灰副标题（参考站列表页同款） */}
      <div>
        <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
          AI 知识库
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          系统化学习 AI 核心概念、工程实践与前沿技术，从入门到精通。
        </p>
      </div>

      {/* 学习路线图入口 */}
      <Link
        href="/knowledge/roadmap"
        className="group flex items-center gap-3 rounded-lg bg-zinc-100 px-4 py-3 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1677ff]/10 text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
          <Compass size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900 transition group-hover:text-[#1677ff] dark:text-zinc-50 dark:group-hover:text-[#5aa0ff]">
            AI 学习路线图
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            不知道从哪开始？五个阶段串起全部知识库，从零基础到原理与自建。
          </span>
        </span>
        <ChevronRight
          size={16}
          className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-[#1677ff] dark:text-zinc-500 dark:group-hover:text-[#5aa0ff]"
        />
      </Link>

      {/* 知识库卡片网格：灰底面板 + 紧凑卡（参考站同款） */}
      {loading ? (
        <DirectoryGrid>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </DirectoryGrid>
      ) : bases.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="暂无知识库"
          description="正在努力收集中，敬请期待。"
        />
      ) : (
        <DirectoryGrid>
          {bases.map((b, i) => (
            <DirectoryCard
              key={b.name}
              href={`/knowledge/${encodeURIComponent(b.name)}`}
              icon={
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${
                    AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                  }`}
                >
                  {b.name[0]}
                </span>
              }
              name={b.name}
              desc={
                [
                  b.isPath ? "学习路径" : null,
                  b.description ?? null,
                  `${b.count} 篇文档`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              }
            />
          ))}
        </DirectoryGrid>
      )}
    </div>
  );
}
