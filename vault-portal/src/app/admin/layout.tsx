"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

const MOBILE_NAV = [
  { href: "/admin", label: "概览" },
  { href: "/admin/content/tools", label: "工具" },
  { href: "/admin/content/prompts", label: "提示词" },
  { href: "/admin/content/articles", label: "文章" },
  { href: "/admin/content/news", label: "资讯" },
  { href: "/admin/review", label: "审核" },
  { href: "/admin/reports", label: "举报" },
  { href: "/admin/sources", label: "数据源" },
  { href: "/admin/users", label: "用户" },
  { href: "/admin/categories", label: "分类" },
];

/**
 * 后台统一布局：
 * - 未登录 → 跳转登录页
 * - 已登录但非 admin → 跳转首页（不渲染任何后台内容）
 * - admin → 渲染侧边栏 + 子页面
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    void (async () => {
      if (loading) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.role !== "admin") {
        router.replace("/");
        return;
      }
      setAllowed(true);
    })();
  }, [user, loading, router]);

  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[#1677ff] dark:border-zinc-700 dark:border-t-[#5aa0ff]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 移动端横向导航 */}
      <div className="mb-6 -mx-4 overflow-x-auto px-4 md:hidden">
        <div className="flex w-max gap-2 pb-1">
          {MOBILE_NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-[#1677ff] text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
