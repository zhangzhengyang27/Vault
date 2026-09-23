import type { ReactNode } from "react";
import { listMetadata } from "@/lib/pageMeta";

export const metadata = listMetadata({
  title: "MCP 服务",
  description: "发现优质的 MCP（Model Context Protocol）服务器，扩展 AI 助手的能力边界。",
  path: "/mcp",
});

export default function McpListLayout({ children }: { children: ReactNode }) {
  return children;
}
