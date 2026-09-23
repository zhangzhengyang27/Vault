import Link from "next/link";
import type { ReactNode } from "react";

/**
 * codefather 同款目录站设计系统共享组件：
 * - DirectoryGrid：灰底面板 + 多列紧凑卡网格（参考站 bg-secondary rounded-md p-4）
 * - DirectoryCard：白卡（40px 圆形图标 + 14px 名称 + 12px 灰色单行描述）
 * - RankList：序号榜单（前 3 橙色，其余灰色，可选计数）
 * - DetailSidebar：详情页右侧 300px 吸顶栏容器
 */

export function DirectoryGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md bg-zinc-100 p-3 dark:bg-zinc-900/60 sm:p-4 ${className}`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
        {children}
      </div>
    </div>
  );
}

export function DirectoryCard({
  href,
  icon,
  name,
  desc,
  external = false,
}: {
  href: string;
  /** 40px 圆形图标内容（img / 首字母等），由调用方渲染 */
  icon: ReactNode;
  name: string;
  desc?: string;
  /** true 时新窗口打开（外链工具站） */
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-2 rounded bg-white p-2 shadow-sm transition hover:opacity-80 dark:bg-zinc-900"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {name}
        </span>
        {desc && (
          <span className="mt-0.5 block truncate text-xs leading-4 text-zinc-400 dark:text-zinc-500">
            {desc}
          </span>
        )}
      </span>
    </Link>
  );
}

export function RankListItem({
  href,
  index,
  title,
  count,
  countText,
}: {
  href: string;
  index: number;
  title: string;
  count?: number;
  countText?: string;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-baseline gap-2.5">
        <span
          className={`w-5 shrink-0 text-center text-sm font-semibold ${
            index < 3 ? "text-orange-500" : "text-zinc-300 dark:text-zinc-600"
          }`}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-600 transition group-hover:text-[#1677ff] dark:text-zinc-300 dark:group-hover:text-[#5aa0ff]">
          {title}
        </span>
        {typeof count === "number" && count > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            🔥 {count}
          </span>
        )}
        {countText && (
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
            {countText}
          </span>
        )}
      </Link>
    </li>
  );
}

export function RankList({
  items,
}: {
  items: {
    key: string | number;
    href: string;
    title: string;
    count?: number;
    countText?: string;
  }[];
}) {
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((it, i) => (
        <RankListItem
          key={it.key}
          href={it.href}
          index={i}
          title={it.title}
          count={it.count}
          countText={it.countText}
        />
      ))}
    </ul>
  );
}

/** 侧栏白卡容器 */
export function SidebarCard({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/** 详情页双栏骨架：主列 + 300px 吸顶侧栏 */
export function DetailShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1 space-y-4">{children}</div>
      <aside className="hidden w-[300px] shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">{sidebar}</div>
      </aside>
    </div>
  );
}

/** 列表页页头：大标题 + 副标题 + 搜索框（参考站 /tool /mcp /painting 同款） */
export function DirectoryHeader({
  title,
  subtitle,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearchSubmit,
  children,
}: {
  title: string;
  subtitle?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: () => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
      {onSearchChange && (
        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.();
          }}
        >
          <div className="flex h-9 w-full max-w-md items-center gap-2 rounded-md bg-zinc-100 px-3 dark:bg-zinc-800">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0 text-zinc-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? "搜索"}
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-[#1677ff] px-4 text-sm text-white transition hover:bg-[#4096ff]"
          >
            搜索
          </button>
        </form>
      )}
      {children}
    </div>
  );
}

/** 分类 chips 行（参考站：灰底药丸，激活蓝底白字） */
export function ChipRow({
  items,
  active,
  onSelect,
}: {
  items: { key: string; label: string; count?: number }[];
  active?: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onSelect?.(it.key)}
            className={`rounded-full px-3 py-1 text-[13px] transition ${
              isActive
                ? "bg-[#1677ff] text-white"
                : "bg-zinc-100 text-zinc-800 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-200"
            }`}
          >
            {it.label}
            {typeof it.count === "number" && (
              <span className={isActive ? "text-white/70" : "text-zinc-400"}>
                {" "}
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
