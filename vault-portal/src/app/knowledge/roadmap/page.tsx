"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ChevronRight, FileText, Flag } from "lucide-react";

interface KnowledgeBase {
  name: string;
  count: number;
  description?: string | null;
  isPath?: boolean;
  categories?: string[];
}

interface Stage {
  id: number;
  title: string;
  tagline: string;
  description: string;
  kbs: string[];
}

// 学习路线：按"人群 × 深度"组织，KB 名称与 knowledge_bases 严格一致
const STAGES: Stage[] = [
  {
    id: 0,
    title: "零基础起步",
    tagline: "没有技术背景，从这里开始",
    description:
      "先建立对生成式 AI 的完整认知：它是什么、怎么用、什么时候会出错。不写代码，人人可学。",
    kbs: ["生成式 AI 通识入门"],
  },
  {
    id: 1,
    title: "个人效率进阶",
    tagline: "把 AI 用成日常生产力",
    description:
      "面向所有想把 AI 用好的职场人与创作者：提示词从入门到工程化，编程助手与图像生成按需选学。",
    kbs: ["提示词", "提示词工程进阶", "Cursor 从入门到精通", "图像生成"],
  },
  {
    id: 2,
    title: "应用开发入门",
    tagline: "第一次动手写 AI 应用",
    description:
      "面向有基础开发能力、想做出第一个 AI 应用的读者：API 调用、提示工程、RAG 与评估的最小闭环。",
    kbs: ["LLM 应用开发实战"],
  },
  {
    id: 3,
    title: "专项深入",
    tagline: "按方向选择，可并行",
    description:
      "三条当前最主流的技术专项：检索增强（RAG）、工具协议（MCP）、智能体设计。框架与项目实战见《AI Agent 从零实战》。",
    kbs: ["RAG 从入门到生产", "MCP 从零到一", "智能体原理与生产化", "AI Agent 从零实战"],
  },
  {
    id: 4,
    title: "原理与自建",
    tagline: "知其所以然，模型自己跑",
    description:
      "理解大模型的内部原理（Happy-LLM），并把开源模型部署到自己手里：Ollama/vLLM、量化与微调。",
    kbs: ["Happy-LLM 大模型原理与实践", "开源模型本地部署与微调"],
  },
];

// 贯穿全程的"资源雷达"：找论文、找模型、找数据集、追评测
const COMPANION = "AI 数据库与数据源";

export default function RoadmapPage() {
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

  const byName = new Map(bases.map((b) => [b.name, b]));
  const kbCard = (name: string) => {
    const b = byName.get(name);
    if (!b) return null;
    return (
      <Link
        key={name}
        href={`/knowledge/${encodeURIComponent(name)}`}
        className="group flex items-center gap-2.5 rounded-md bg-zinc-100 px-3.5 py-2.5 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-800 transition-colors group-hover:text-[#1677ff] dark:text-zinc-100 dark:group-hover:text-[#5aa0ff]">
            <span className="truncate">{name}</span>
            {b.isPath && (
              <span className="shrink-0 rounded bg-[#1677ff]/10 px-1 py-px text-[10px] font-medium text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
                路径
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            <FileText size={11} /> {b.count} 篇
          </span>
        </span>
        <ChevronRight
          size={14}
          className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-[#1677ff] dark:text-zinc-500 dark:group-hover:text-[#5aa0ff]"
        />
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页头：大标题 + 灰副标题（参考站列表页同款） */}
      <div>
        <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
          AI 学习路线图
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          不知道从哪开始？按阶段串起全部知识库：从零基础认知到专项深入，再到原理与自建。每个阶段都可按需取舍。
        </p>
      </div>

      {/* 全程伴随 */}
      <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1677ff]/10 text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
            <Compass size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              全程伴随：《{COMPANION}》
            </p>
            <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              任何阶段遇到「该去哪找论文 / 模型 / 数据集 / 榜单」的问题，都去这本资源雷达查阅。{" "}
              <Link
                href={`/knowledge/${encodeURIComponent(COMPANION)}`}
                className="font-medium text-[#1677ff] hover:underline dark:text-[#5aa0ff]"
              >
                打开 →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 阶段时间线：蓝色节点 + 虚线连线 + 阶段白卡 */}
      <div>
        {STAGES.map((stage, idx) => (
          <div key={stage.id} className="flex gap-4">
            {/* 左侧时间线导轨 */}
            <div className="flex w-3 shrink-0 flex-col items-center">
              <span className="mt-7 h-3 w-3 shrink-0 rounded-full bg-[#1677ff] ring-4 ring-[#1677ff]/15 dark:bg-[#5aa0ff] dark:ring-[#5aa0ff]/15" />
              {idx < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className="mt-2 -mb-9 w-px flex-1 border-l-2 border-dashed border-[#1677ff]/30 dark:border-[#5aa0ff]/30"
                />
              )}
            </div>
            {/* 阶段白卡（pb-6 由本行承载，作为与下一行的间距，连线借此贯通） */}
            <div className="min-w-0 flex-1 pb-6">
              <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1677ff]/10 text-[13px] font-bold text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
                    {stage.id === 0 ? <Flag size={14} /> : stage.id}
                  </span>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {stage.title}
                  </h2>
                  <span className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
                    {stage.tagline}
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                  {stage.description}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {stage.kbs.map((name) =>
                    loading || byName.has(name) ? (
                      kbCard(name)
                    ) : (
                      <div
                        key={name}
                        className="hidden"
                        aria-hidden
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs leading-5 text-zinc-400 dark:text-zinc-500">
        路线是建议不是规则：有开发背景的读者可以跳过阶段 0-1 直接从阶段 2 进入；每本知识库也支持独立查阅（返回
        <Link href="/knowledge" className="mx-0.5 font-medium text-[#1677ff] hover:underline dark:text-[#5aa0ff]">
          知识库列表
        </Link>
        ）。
      </p>
    </div>
  );
}
