import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "标签总览",
  description: "全站内容标签总览，按标签快速检索工具与提示词。",
  path: "/tags",
});

export default function TagsListLayout({ children }: { children: ReactNode }) {
  return children;
}
