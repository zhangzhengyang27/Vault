import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** 列表接口可能返回裸数组，也可能返回 { items: [...] } */
type ListResponse<T> = T[] | { items?: T[] };

interface NewsItem {
  slug: string;
  title: string;
  summary?: string;
  time?: string;
}

interface ToolItem {
  slug: string;
  name: string;
  description?: string;
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
}

/** CDATA 安全：]]> 会提前终止 CDATA 段，必须拆开转义 */
function cdata(text: string): string {
  return `<![CDATA[${text.split("]]>").join("]]&gt;]]&gt;")}]]>`;
}

/** RFC-822 pubDate：解析失败回退当前时间，避免输出 Invalid Date 破坏 feed */
function toRfc822(value: unknown): string {
  const d = new Date(typeof value === "string" ? value : Date.now());
  return Number.isNaN(d.getTime())
    ? new Date().toUTCString()
    : d.toUTCString();
}

export async function GET() {
  try {
    // 获取最新资讯
    const newsRes = await fetch(`${API_BASE}/api/news?limit=20`, {
      next: { revalidate: 3600 },
    }).catch(() => null);

    const items: FeedItem[] = [];

    if (newsRes?.ok) {
      const data: ListResponse<NewsItem> = await newsRes.json();
      const news = Array.isArray(data) ? data : data.items ?? [];
      news.forEach((n) => {
        items.push({
          title: n.title,
          link: `${SITE_URL}/news/${n.slug}`,
          description: n.summary || "",
          pubDate: n.time || new Date().toISOString(),
          category: "资讯",
        });
      });
    }

    // 获取最新工具
    const toolsRes = await fetch(`${API_BASE}/api/tools?limit=10`, {
      next: { revalidate: 3600 },
    }).catch(() => null);

    if (toolsRes?.ok) {
      const data: ListResponse<ToolItem> = await toolsRes.json();
      const tools = Array.isArray(data) ? data : data.items ?? [];
      tools.forEach((t) => {
        items.push({
          title: `[新工具] ${t.name}`,
          link: `${SITE_URL}/tools/${t.slug}`,
          description: t.description || "",
          pubDate: new Date().toISOString(),
          category: "工具",
        });
      });
    }

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI 导航 — 一站式中文 AI 门户</title>
    <link>${SITE_URL}</link>
    <description>聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${items
      .map(
        (item) => `    <item>
      <title>${cdata(item.title)}</title>
      <link>${item.link}</link>
      <description>${cdata(item.description)}</description>
      <pubDate>${toRfc822(item.pubDate)}</pubDate>
      <category>${item.category}</category>
      <guid isPermaLink="true">${item.link}</guid>
    </item>`,
      )
      .join("\n")}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AI 导航</title><link>${SITE_URL}</link><description>RSS Feed</description></channel></rss>`,
      {
        headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
      },
    );
  }
}
