import type { Metadata } from "next";
import PromptsList from "@/components/PromptsList";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "网页生成提示词 · AI 提示词",
  description:
    "面向 Cursor / Claude / v0 等 AI 编程工具的网页生成提示词，复制完整提示词即可生成网页，按热门与最新排序。",
  alternates: { canonical: `${SITE_URL}/prompts/text` },
};

export default function PromptsTextPage() {
  return (
    <PromptsList
      kind="precise"
      media="text"
      title="网页生成提示词"
      subtitle="复制完整提示词，交给 AI 编程工具直接生成网页"
    />
  );
}
