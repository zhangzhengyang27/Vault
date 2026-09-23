"use client";

import { Search } from "lucide-react";

/** 首页 Hero 大搜索（参考站同款灰底圆角条，点击唤起全局搜索） */
export default function SearchTrigger() {
  const openPalette = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <button
      type="button"
      onClick={openPalette}
      className="mx-auto flex h-12 w-full max-w-2xl items-center gap-3 rounded-lg bg-zinc-100 px-4 text-left text-sm text-zinc-400 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800"
    >
      <Search size={18} className="shrink-0" />
      <span className="flex-1 truncate">全站搜索 AI 工具、提示词、MCP、资源…</span>
      <kbd className="hidden shrink-0 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline dark:border-zinc-600 dark:bg-zinc-900">
        ⌘K
      </kbd>
    </button>
  );
}
