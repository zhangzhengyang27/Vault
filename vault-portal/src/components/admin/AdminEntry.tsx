"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

/** 仅管理员可见的后台入口（用于 Footer 等服务端组件中） */
export default function AdminEntry() {
  const { user } = useAuth();
  if (user?.role !== "admin") return null;
  return (
    <Link
      href="/admin"
      className="text-xs text-zinc-500 transition hover:text-[#1677ff] dark:text-zinc-400 dark:hover:text-[#5aa0ff]"
    >
      运营后台
    </Link>
  );
}
