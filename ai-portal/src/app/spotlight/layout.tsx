import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "场景专题",
  description: "围绕具体场景的 AI 工具与提示词专题精选，即查即用。",
  path: "/spotlight",
});

export default function SpotlightListLayout({ children }: { children: ReactNode }) {
  return children;
}
