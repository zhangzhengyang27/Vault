"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import NotificationBell from "@/components/NotificationBell";
import UserMenu from "@/components/UserMenu";

/** 扁平一级导航（codefather 同款：logo + 平铺菜单 + 右侧操作区）；
 *  children 非空时桌面端渲染为悬停下拉，父项点击仍跳 href */
interface NavLinkItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "主页" },
  { href: "/tools", label: "AI工具" },
  { href: "/mcp", label: "MCP" },
  { href: "/skills", label: "Skills" },
  {
    href: "/prompts",
    label: "AI提示词",
    children: [
      { href: "/prompts", label: "通用提示词" },
      { href: "/prompts/precise", label: "图片画廊" },
      { href: "/prompts/text", label: "网页生成" },
    ],
  },
  { href: "/knowledge", label: "AI知识库" },
  { href: "/news", label: "AI资讯" },
  { href: "/community", label: "社区" },
  { href: "/github", label: "GitHub开源" },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /** 含子菜单的项：父项或任一子路径命中即高亮 */
  const isGroupActive = (item: (typeof NAV_LINKS)[number]) =>
    [item.href, ...(item.children?.map((c) => c.href) ?? [])].some(isActive);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/90">
      <div className="mx-auto flex min-h-14 w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1677ff] to-[#4096ff] text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI 导航
          </span>
        </Link>

        {/* 桌面端扁平导航（含子菜单的项为悬停下拉） */}
        <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((item) => {
            const active = isGroupActive(item);
            const linkCls = `relative flex shrink-0 whitespace-nowrap items-center gap-0.5 px-2.5 py-2 text-sm transition ${
              active
                ? "font-medium text-[#1677ff] dark:text-[#5aa0ff]"
                : "text-zinc-700 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
            }`;
            if (!item.children) {
              return (
                <Link key={item.href} href={item.href} className={linkCls}>
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-2.5 -bottom-2 h-0.5 rounded-full bg-[#1677ff] dark:bg-[#5aa0ff]" />
                  )}
                </Link>
              );
            }
            return (
              <div key={item.href} className="group relative shrink-0">
                <Link href={item.href} className={linkCls}>
                  {item.label}
                  <ChevronDown
                    size={12}
                    className="transition-transform group-hover:rotate-180"
                  />
                  {active && (
                    <span className="absolute inset-x-2.5 -bottom-2 h-0.5 rounded-full bg-[#1677ff] dark:bg-[#5aa0ff]" />
                  )}
                </Link>
                {/* 下拉面板：pt-2 补 hover 间隙，防止移向面板时菜单收起 */}
                <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                  <div className="w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm transition ${
                          pathname === child.href
                            ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-[#5aa0ff]"
                        }`}
                      >
                        {child.label}
                        {isActive(child.href) && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1677ff] dark:bg-[#5aa0ff]" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/submit"
            className="hidden items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:text-[#1677ff] dark:text-zinc-300 sm:inline-flex"
          >
            <Plus size={13} /> 提交
          </Link>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-command-palette"))
            }
            title="搜索 (Cmd+K)"
            aria-label="搜索"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
          >
            <Search size={16} />
          </button>
          <NotificationBell />
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <UserMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-zinc-600 transition hover:text-[#1677ff] dark:text-zinc-300 sm:inline"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-full bg-[#1677ff] px-3.5 py-1.5 text-sm text-white transition hover:bg-[#4096ff]"
              >
                注册
              </Link>
            </>
          )}

          {/* 移动端汉堡按钮 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 lg:hidden"
            aria-label="菜单"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
          <nav className="grid grid-cols-2 gap-1">
            {/* 移动端无悬停：父子项平铺直达 */}
            {NAV_LINKS.flatMap((item) => [
              { href: item.href, label: item.label },
              ...(item.children ?? []),
            ]).map((link, idx) => (
              <Link
                key={`${link.href}-${idx}`}
                href={link.href}
                onClick={closeMobile}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  isActive(link.href)
                    ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/spotlight"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
            >
              场景专题
            </Link>
          </nav>

          <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Link
              href="/submit"
              onClick={closeMobile}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              <Plus size={14} /> 提交内容
            </Link>
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={closeMobile}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300"
                >
                  {user.nickname ?? user.username}
                </Link>
                <Link
                  href="/messages"
                  onClick={closeMobile}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300"
                >
                  消息中心
                </Link>
                <Link
                  href="/profile/settings"
                  onClick={closeMobile}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300"
                >
                  编辑资料
                </Link>
                <button
                  onClick={() => {
                    logout();
                    closeMobile();
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-rose-600 dark:text-rose-400"
                >
                  退出登录
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="flex-1 rounded-full px-3 py-2 text-center text-sm text-zinc-600 ring-1 ring-zinc-200 dark:text-zinc-300 dark:ring-zinc-700"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobile}
                  className="flex-1 rounded-full bg-[#1677ff] px-3 py-2 text-center text-sm text-white"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
