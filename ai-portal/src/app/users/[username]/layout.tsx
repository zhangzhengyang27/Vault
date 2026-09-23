import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const u = await res.json();
      return {
        title: `${u.username} 的主页`,
        description: `${u.username} 在 AI 导航的投稿与互动记录。`,
        alternates: { canonical: `${SITE_URL}/users/${username}` },
      };
    }
  } catch {
    /* 后端不可用时回退默认标题 */
  }
  return { title: "用户主页" };
}

export default function DetailMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
