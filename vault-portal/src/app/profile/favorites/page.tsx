"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Trash2, Wrench, MessageSquare, Plug, FileText, Code2, Download, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";

interface FavItem {
  id: number;
  targetType: string;
  targetId: number;
  targetSlug?: string | null;
  title?: string | null;
  createdAt?: string;
}

const TYPE_META: Record<string, { label: string; icon: LucideIcon; path: string; color: string }> = {
  tool: { label: "工具", icon: Wrench, path: "/tools", color: "text-blue-500" },
  prompt: { label: "提示词", icon: MessageSquare, path: "/prompts", color: "text-emerald-500" },
  mcp: { label: "MCP", icon: Plug, path: "/mcp", color: "text-blue-500" },
  skill: { label: "Skill", icon: Layers, path: "/skills", color: "text-emerald-500" },
  article: { label: "文章", icon: FileText, path: "/knowledge", color: "text-amber-500" },
  news: { label: "资讯", icon: FileText, path: "/news", color: "text-orange-500" },
  repo: { label: "开源项目", icon: Code2, path: "/github", color: "text-zinc-500" },
};

export default function FavoritesPage() {
  const router = useRouter();
  // 必须等 loading 结束再判断登录态：AuthProvider 初始 user=null，
  // 硬刷新时若立刻 redirect 会把已登录用户踢到 /login
  const { user, loading: authLoading } = useAuth();
  const [favs, setFavs] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetch("/api/favorites", {
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FavItem[] | null) => {
        setFavs(Array.isArray(data) ? data : []);
      })
      .catch(() => setFavs([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const removeFav = async (id: number) => {
    if (!user) return;
    const res = await fetch(`/api/favorites/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      window.alert("取消收藏失败，请重试。");
      return;
    }
    setFavs((prev) => prev.filter((f) => f.id !== id));
  };

  const exportFavorites = () => {
    const data = favs.map((f) => ({
      type: f.targetType,
      title: f.title,
      slug: f.targetSlug,
      createdAt: f.createdAt,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favorites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (favs.length === 0) {
    return (
      <EmptyState
        icon={<Star size={20} />}
        title="还没有收藏任何内容"
        description="浏览工具、提示词、MCP 等，点击收藏按钮即可添加到这里。"
        actionLabel="浏览工具"
        actionHref="/tools"
      />
    );
  }

  // 按类型分组
  const grouped = favs.reduce<Record<string, FavItem[]>>((acc, f) => {
    (acc[f.targetType] = acc[f.targetType] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="我的收藏"
        description={`共 ${favs.length} 条收藏，按类型分组展示。`}
        actions={
          <button
            onClick={exportFavorites}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Download size={15} /> 导出 JSON
          </button>
        }
      />

      {Object.entries(grouped).map(([type, items]) => {
        const meta = TYPE_META[type] ?? { label: type, icon: Star, path: "/", color: "text-zinc-500" };
        return (
          <section key={type}>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <meta.icon size={16} className={meta.color} />
              {meta.label}
              <span className="text-xs font-normal text-zinc-400">({items.length})</span>
            </h2>
            <div className="space-y-2">
              {items.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Link
                    href={`${meta.path}/${f.targetSlug ?? f.targetId}`}
                    className="flex-1 text-sm text-zinc-700 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
                  >
                    <span className="font-medium">
                      {f.title || `${meta.label} #${f.targetId}`}
                    </span>
                    <span className="ml-2 text-xs text-zinc-400">
                      {f.title ? meta.label : "点击查看详情"}
                    </span>
                  </Link>
                  <button
                    onClick={() => removeFav(f.id)}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    title="取消收藏"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
