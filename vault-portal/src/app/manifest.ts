import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI 导航 — 一站式中文 AI 门户",
    short_name: "AI 导航",
    description: "聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户。",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#4f46e5",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["productivity", "utilities", "education"],
    lang: "zh-CN",
  };
}
