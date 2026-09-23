import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "AI 工具导航",
  description: "精选 AI 工具大全，覆盖对话、绘画、视频、编程、办公等场景，支持分类浏览与对比。",
  path: "/tools",
});

export default function ToolsListLayout({ children }: { children: ReactNode }) {
  return children;
}
