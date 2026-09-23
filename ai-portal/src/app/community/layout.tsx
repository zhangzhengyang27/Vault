import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "AI 社区",
  description: "AI 社区讨论区：分享经验、交流问题、发现同好。",
  path: "/community",
});

export default function CommunityListLayout({ children }: { children: ReactNode }) {
  return children;
}
