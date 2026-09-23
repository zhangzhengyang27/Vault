import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/mcps/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const m = await res.json();
      return {
        title: `${m.name} · MCP 服务`,
        description: (m.description ?? "").slice(0, 150),
        alternates: { canonical: `${SITE_URL}/mcp/${slug}` },
      };
    }
  } catch {
    /* 后端不可用时回退默认标题 */
  }
  return { title: "MCP 服务" };
}

export default function DetailMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
