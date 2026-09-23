import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site";

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** 从 markdown 正文提取纯文本摘要（截断 + 去 markdown 标记） */
function excerpt(content: string, max = 120): string {
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*`~\[\]()!_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 帖子详情页 metadata：社区页面本体是客户端组件，由本 layout 补齐 SEO 元数据 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let title = "社区帖子";
  let description = "AI 社区讨论帖";
  try {
    const res = await fetch(`${API_BASE}/api/posts/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const post = (await res.json()) as { title?: string; content?: string };
      if (post.title) title = post.title;
      if (post.content) description = excerpt(post.content);
    }
  } catch {
    // 取不到帖子信息时用默认值，不影响渲染
  }
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/community/${id}` },
    openGraph: { title, description, url: `${SITE_URL}/community/${id}` },
  };
}

export default function CommunityPostLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
