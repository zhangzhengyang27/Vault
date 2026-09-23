import type { Metadata } from "next";
import PromptsList from "@/components/PromptsList";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "精确提示词 · AI 提示词",
  description:
    "带真实出图示例的精确提示词瀑布流，覆盖人像、风景、电商、海报等场景，一键复制高质量绘图提示词。",
  alternates: { canonical: `${SITE_URL}/prompts/precise` },
};

export default function PrecisePromptsPage() {
  return (
    <PromptsList
      kind="precise"
      media="image"
      title="精确提示词"
      subtitle="带真实出图示例的提示词画廊，一键复制即可使用"
    />
  );
}
