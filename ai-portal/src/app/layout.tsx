import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CommandPalette from "@/components/CommandPalette";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "AI 导航 — 一站式中文 AI 门户",
    template: "%s — AI 导航",
  },
  description:
    "聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户，让不同人群找得到、学得会、用得上。",
  keywords: [
    "AI工具",
    "AI导航",
    "提示词",
    "Prompt",
    "MCP",
    "AI知识库",
    "AI资讯",
    "AI开源项目",
  ],
  authors: [{ name: "AI 导航" }],
  // metadataBase：解析相对 OG 图片地址的基准，也向各页提供规范化域名
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "AI 导航",
    title: "AI 导航 — 一站式中文 AI 门户",
    description:
      "聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI 导航",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 导航 — 一站式中文 AI 门户",
    description:
      "聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // 不设全局 canonical：根布局的 canonical 会被所有页面继承（全站指向首页），
  // canonical 应由各页面按自身 URL 声明
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// 在 hydration 前注入，避免深浅主题首屏闪烁（FOUC）
const themeInitScript = `(function(){try{var t=localStorage.getItem('ai_portal_theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AuthProvider>
          <ThemeProvider>
            <Nav />
            <CommandPalette />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
                <ErrorBoundary>{children}</ErrorBoundary>
              </div>
            </main>
            <Footer />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
