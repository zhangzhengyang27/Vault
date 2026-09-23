import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "AI Skills 技能库",
  description: "发现实用的 Agent Skills，为 AI 编程助手安装即用的扩展能力。",
  path: "/skills",
});

export default function SkillsListLayout({ children }: { children: ReactNode }) {
  return children;
}
