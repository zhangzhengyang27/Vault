"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Wrench,
  MessageSquare,
  Plug,
  FileText,
  Newspaper,
  Code2,
  Layers,
  CornerDownLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SearchItem {
  type: string;
  slug: string;
  name: string;
  description?: string;
  path: string;
  icon: LucideIcon;
}

/** 搜索接口返回的扁平条目 */
interface SearchApiItem {
  type: string;
  name: string;
  desc?: string;
  slug: string;
  href?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; path: string }> = {
  tool: { label: "工具", icon: Wrench, path: "/tools" },
  prompt: { label: "提示词", icon: MessageSquare, path: "/prompts" },
  mcp: { label: "MCP", icon: Plug, path: "/mcp" },
  skill: { label: "Skill", icon: Layers, path: "/skills" },
  article: { label: "知识库", icon: FileText, path: "/knowledge" },
  news: { label: "资讯", icon: Newspaper, path: "/news" },
  repo: { label: "开源", icon: Code2, path: "/github" },
};

// 搜索 API 返回的中文 type → 英文 key
const CN_TO_EN: Record<string, string> = {
  工具: "tool",
  提示词: "prompt",
  MCP: "mcp",
  Skill: "skill",
  知识库: "article",
  资讯: "news",
  开源: "repo",
};

/**
 * 全站 Cmd-K 命令面板。
 * 按 Cmd/Ctrl+K 打开，模糊搜索工具/提示词/MCP/文章，回车直达。
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // 快捷键打开
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 外部自定义事件触发打开（首页搜索框等点击调用）
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, []);

  // 打开时锁定 body 滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // 搜索
  useEffect(() => {
    if (!open || !query.trim()) {
      void (async () => {
        setResults([]);
        setLoading(false);
      })();
      return;
    }
    void (async () => {
      setLoading(true);
    })();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=20`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data: SearchApiItem[] | null = await res.json();
        const items: SearchItem[] = [];
        // 搜索 API 返回扁平数组：{ type: "工具", name, desc, slug, href }
        if (Array.isArray(data)) {
          for (const r of data.slice(0, 15)) {
            const enType = CN_TO_EN[r.type] ?? "tool";
            const cfg = TYPE_CONFIG[enType];
            if (!cfg) continue;
            items.push({
              type: enType,
              slug: r.slug,
              name: r.name,
              description: r.desc,
              path: r.href ?? `${cfg.path}/${r.slug}`,
              icon: cfg.icon,
            });
          }
        }
        setResults(items);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const navigate = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      setQuery("");
      router.push(item.path);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Search size={18} className="shrink-0 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索工具、提示词、MCP、文章..."
            className="flex-1 bg-transparent py-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
            ESC
          </kbd>
        </div>

        {/* 结果列表 */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-zinc-400">搜索中...</div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-400">
              未找到与「{query}」匹配的内容
            </div>
          )}
          {!query.trim() && (
            <div className="p-6 text-center text-sm text-zinc-400">
              <p>输入关键词开始搜索</p>
              <p className="mt-1 text-xs">支持工具、提示词、MCP、文章、资讯</p>
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.slug}`}
              onClick={() => navigate(item)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                i === activeIndex
                  ? "bg-blue-50 dark:bg-blue-500/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <item.icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </p>
                {item.description && (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {TYPE_CONFIG[item.type]?.label ?? item.type}
              </span>
              {i === activeIndex && (
                <CornerDownLeft size={14} className="shrink-0 text-zinc-400" />
              )}
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
          <span>↑↓ 选择 · 回车跳转 · ESC 关闭</span>
          <span>Cmd+K</span>
        </div>
      </div>
    </div>
  );
}
