import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "AI 资讯",
  description: "聚合全网 AI 领域最新资讯、产品动态与行业观察，每日更新。",
  path: "/news",
});

export default function NewsListLayout({ children }: { children: ReactNode }) {
  return children;
}
