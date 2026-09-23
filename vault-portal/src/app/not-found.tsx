"use client";

import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-7xl font-bold tracking-tight text-zinc-200 dark:text-zinc-800">
        404
      </div>
      <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        页面未找到
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        你访问的页面可能已被移动、删除，或者链接有误。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff]"
        >
          <Home size={15} /> 返回首页
        </Link>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("open-command-palette"))
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Search size={15} /> 搜索内容
        </button>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft size={15} /> 返回上页
        </button>
      </div>
    </div>
  );
}
