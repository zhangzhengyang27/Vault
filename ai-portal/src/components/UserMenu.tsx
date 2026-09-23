"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, MessageSquare, Settings, User } from "lucide-react";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

const MENU = [
  { href: "/profile", label: "个人中心", icon: User },
  { href: "/messages", label: "消息中心", icon: MessageSquare },
  { href: "/profile/settings", label: "编辑资料", icon: Settings },
];

/** 仅管理员可见的后台入口（前端隐藏是体验，后端 @Roles 才是安全） */
const ADMIN_MENU = [
  { href: "/admin", label: "后台管理", icon: LayoutDashboard },
];

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
        title="账号菜单"
      >
        <Avatar
          name={user.nickname ?? user.username}
          src={user.avatar}
          size={24}
          rounded="rounded"
        />
        <span className="hidden whitespace-nowrap text-sm font-medium text-zinc-600 dark:text-zinc-300 sm:inline">
          {user.nickname ?? user.username}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {MENU.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            >
              <Icon size={14} /> {label}
            </Link>
          ))}
          {user.role === "admin" && (
            <>
              <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              {ADMIN_MENU.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                >
                  <Icon size={14} /> {label}
                </Link>
              ))}
            </>
          )}
          <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-zinc-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-300 dark:hover:bg-rose-500/10"
          >
            <LogOut size={14} /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}
