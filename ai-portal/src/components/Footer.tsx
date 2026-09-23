import Link from "next/link";
import { Sparkles, Wrench, Sparkles as PromptIcon, BookOpen, Newspaper } from "lucide-react";
import AdminEntry from "@/components/admin/AdminEntry";

const LINK_GROUPS = [
  {
    title: "内容",
    links: [
      { href: "/tools", label: "AI 工具" },
      { href: "/prompts", label: "AI 提示词" },
      { href: "/knowledge", label: "AI 知识库" },
      { href: "/mcp", label: "MCP 服务" },
      { href: "/skills", label: "Skills" },
    ],
  },
  {
    title: "发现",
    links: [
      { href: "/news", label: "AI 资讯" },
      { href: "/spotlight", label: "场景专题" },
      { href: "/resources", label: "学习资源" },
      { href: "/github", label: "GitHub 开源" },
      { href: "/community", label: "交流社区" },
    ],
  },
  {
    title: "账户",
    links: [
      { href: "/profile", label: "个人中心" },
      { href: "/submit", label: "提交内容" },
      { href: "/login", label: "登录" },
      { href: "/register", label: "注册" },
    ],
  },
];

const STATS = [
  { icon: Wrench, label: "AI 工具" },
  { icon: PromptIcon, label: "提示词" },
  { icon: BookOpen, label: "知识库" },
  { icon: Newspaper, label: "资讯" },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
                <Sparkles size={16} />
              </div>
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                AI 导航
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户，让不同人群找得到、学得会、用得上。
            </p>

            {/* 数据统计模块 */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                  >
                    <Icon size={14} className="text-indigo-500" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {group.title === "账户" && <AdminEntry />}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            © {new Date().getFullYear()} AI 导航 · 用 AI 改变工作方式
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
            <Link href="/about" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              关于我们
            </Link>
            <Link href="/privacy" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              隐私政策
            </Link>
            <Link href="/contact" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              联系方式
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
