"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Sparkles,
  BookOpen,
  Newspaper,
  Inbox,
  Radio,
  Users,
  Tags,
  type LucideIcon,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const TOP_LINKS: NavLink[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
];

const CONTENT_LINKS: NavLink[] = [
  { href: "/admin/content/tools", label: "AI 工具", icon: Wrench },
  { href: "/admin/content/prompts", label: "提示词", icon: Sparkles },
  { href: "/admin/content/articles", label: "文章", icon: BookOpen },
  { href: "/admin/content/news", label: "资讯", icon: Newspaper },
];

const BOTTOM_LINKS: NavLink[] = [
  { href: "/admin/review", label: "审核中心", icon: Inbox },
  { href: "/admin/sources", label: "数据源", icon: Radio },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/categories", label: "分类标签", icon: Tags },
];

function SidebarItem({ item, pathname }: { item: NavLink; pathname: string }) {
  const active = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#1677ff]/10 text-[#1677ff] dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
      }`}
    >
      <Icon size={16} />
      {item.label}
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="sticky top-24 space-y-5 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-0.5">
          {TOP_LINKS.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            内容管理
          </p>
          <div className="space-y-0.5">
            {CONTENT_LINKS.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            运营
          </p>
          <div className="space-y-0.5">
            {BOTTOM_LINKS.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
