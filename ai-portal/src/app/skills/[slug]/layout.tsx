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
    // Skills 与 MCP 同存储于 mcps 表（type=skill）；
    // 带 type 查询，避免 MCP 条目复用本页 SEO 标题（页面本体只会渲染"技能未找到"）
    const res = await fetch(
      `${API_BASE}/api/mcps/${encodeURIComponent(slug)}?type=skill`,
      {
        next: { revalidate: 300 },
      },
    );
    if (res.ok) {
      const s = await res.json();
      return {
        title: `${s.name} · Agent Skill`,
        description: (s.description ?? "").slice(0, 150),
        alternates: { canonical: `${SITE_URL}/skills/${slug}` },
      };
    }
  } catch {
    /* 后端不可用时回退默认标题 */
  }
  return { title: "Agent Skill" };
}

export default function DetailMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
