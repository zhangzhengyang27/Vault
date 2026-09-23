"use client";

import { useState } from "react";
import { SPOTLIGHTS } from "@/lib/spotlights";
import { ChipRow } from "@/components/directory";
import { CardGrid, ContentCard, CardTag, CardIcon } from "@/components/cards";

export default function SpotlightListPage() {
  // chips 作为专题快捷筛选：「全部」+ 每个专题（计数为策划工具数）
  const [active, setActive] = useState("全部");
  const visible =
    active === "全部"
      ? SPOTLIGHTS
      : SPOTLIGHTS.filter((s) => s.slug === active);

  return (
    <div className="space-y-5">
      {/* 页头：大标题 + 副标题（codefather 列表页同款排版） */}
      <div>
        <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
          场景专题
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          按职业和场景发现 AI 工具，每个专题精心策划对应工具、提示词和 MCP，帮你快速搭建
          AI 工作流。
        </p>
      </div>

      <ChipRow
        items={[
          { key: "全部", label: "全部", count: SPOTLIGHTS.length },
          ...SPOTLIGHTS.map((s) => ({
            key: s.slug,
            label: s.title,
            count: s.tools.length,
          })),
        ]}
        active={active}
        onSelect={setActive}
      />

      <CardGrid>
        {visible.map((s) => (
          <ContentCard
            key={s.slug}
            href={`/spotlight/${s.slug}`}
            icon={
              <CardIcon className="bg-gradient-to-br from-[#1677ff] to-violet-500 text-lg text-white shadow-sm transition group-hover:shadow-md">
                {s.icon}
              </CardIcon>
            }
            title={s.title}
            tags={
              <>
                <CardTag>{s.tools.length} 个工具</CardTag>
                <CardTag tone="zinc">{s.prompts.length} 个提示词</CardTag>
              </>
            }
            description={s.description}
          />
        ))}
      </CardGrid>
    </div>
  );
}
