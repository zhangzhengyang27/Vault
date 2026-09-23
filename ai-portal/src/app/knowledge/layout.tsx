import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "AI 知识库",
  description: "系统化的 AI 知识库，覆盖工具教程、概念科普、评测榜单与行业报告。",
  path: "/knowledge",
});

export default function KnowledgeListLayout({ children }: { children: ReactNode }) {
  return children;
}
