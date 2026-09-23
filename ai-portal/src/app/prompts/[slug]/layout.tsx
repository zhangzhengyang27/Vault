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
    const res = await fetch(`${API_BASE}/api/prompts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const p = await res.json();
      return {
        title: `${p.title} · AI 提示词`,
        description: (p.description ?? "").slice(0, 150),
        alternates: { canonical: `${SITE_URL}/prompts/${slug}` },
      };
    }
  } catch {
    /* 后端不可用时回退默认标题 */
  }
  return { title: "AI 提示词" };
}

export default function DetailMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
