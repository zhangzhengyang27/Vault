import type { Metadata } from "next";
import PromptsList from "@/components/PromptsList";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI 提示词 · 通用提示词",
  description:
    "面向日常对话、写作、编程、办公等场景的通用 AI 提示词库，按分类浏览，一键复制即用。",
  alternates: { canonical: `${SITE_URL}/prompts` },
};

export default function PromptsPage() {
  return (
    <PromptsList
      kind="general"
      title="通用提示词"
      subtitle="精选提示词模板，复制即可使用"
    />
  );
}
