import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "GitHub 开源精选",
  description: "精选 AI 相关 GitHub 开源项目，按热度与领域浏览，附详情与上手指引。",
  path: "/github",
});

export default function GithubListLayout({ children }: { children: ReactNode }) {
  return children;
}
