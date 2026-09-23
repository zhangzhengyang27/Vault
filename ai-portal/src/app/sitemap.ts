import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL } from "@/lib/site";
import { SPOTLIGHTS } from "@/lib/spotlights";

const STATIC_PATHS = [
  "",
  "/tools",
  "/prompts",
  "/knowledge",
  "/mcp",
  "/skills",
  "/news",
  "/github",
  "/spotlight",
  "/community",
  "/tags",
  "/submit",
];

/** 列表接口可能返回裸数组，也可能返回 { items: [...] } */
type ListResponse<T> = T[] | { items?: T[] };

/** sitemap 只用得到 slug，其余字段不声明 */
interface SlugItem {
  slug: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  // 场景专题详情页：slug 为前端静态配置，无需调接口
  const spotlightUrls: MetadataRoute.Sitemap = SPOTLIGHTS.map((s) => ({
    url: `${BASE_URL}/spotlight/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // 动态获取工具列表
  try {
    const API_BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
    const [
      toolsRes,
      promptsRes,
      newsRes,
      githubRes,
      mcpsRes,
      skillsRes,
    ] = await Promise.all(
      [
        "/api/tools?limit=100",
        "/api/prompts?limit=100",
        "/api/news?limit=100",
        "/api/repos?limit=100",
        "/api/mcps?limit=100",
        "/api/mcps?limit=100&type=skill",
      ].map((path) =>
        fetch(`${API_BASE}${path}`, { next: { revalidate: 3600 } }).catch(() => null),
      ),
    );

    const dynamicUrls: MetadataRoute.Sitemap = [];

    if (toolsRes?.ok) {
      const data: ListResponse<SlugItem> = await toolsRes.json();
      const items = Array.isArray(data) ? data : data.items ?? [];
      items.forEach((t) => {
        dynamicUrls.push({
          url: `${BASE_URL}/tools/${t.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      });
    }

    if (promptsRes?.ok) {
      const data: ListResponse<SlugItem> = await promptsRes.json();
      const items = Array.isArray(data) ? data : data.items ?? [];
      items.forEach((p) => {
        dynamicUrls.push({
          url: `${BASE_URL}/prompts/${p.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      });
    }

    if (newsRes?.ok) {
      const data: ListResponse<SlugItem> = await newsRes.json();
      const items = Array.isArray(data) ? data : data.items ?? [];
      items.forEach((n) => {
        dynamicUrls.push({
          url: `${BASE_URL}/news/${n.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      });
    }

    const sections: [Response | null, string, number, "weekly" | "monthly"][] = [
      [githubRes, "/github", 0.7, "weekly"],
      [mcpsRes, "/mcp", 0.7, "monthly"],
      [skillsRes, "/skills", 0.7, "monthly"],
    ];

    for (const [res, prefix, priority, cf] of sections) {
      if (!res?.ok) continue;
      const data: ListResponse<SlugItem> = await res.json();
      const items = Array.isArray(data) ? data : data.items ?? [];
      items.forEach((item) => {
        dynamicUrls.push({
          url: `${BASE_URL}${prefix}/${item.slug}`,
          lastModified: now,
          changeFrequency: cf,
          priority,
        });
      });
    }

    return [...staticUrls, ...spotlightUrls, ...dynamicUrls];
  } catch {
    return [...staticUrls, ...spotlightUrls];
  }
}
