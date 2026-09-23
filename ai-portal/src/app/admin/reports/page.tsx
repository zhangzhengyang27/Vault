"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";

interface ReportItem {
  id: number;
  targetType: string;
  targetId: number;
  targetTitle?: string | null;
  reason: string;
  reporter?: string | null;
  status: string;
  createdAt: string;
}

const TARGET_LABELS: Record<string, string> = {
  tool: "工具",
  prompt: "提示词",
  article: "文章",
  news: "资讯",
  repo: "开源",
  resource: "资源",
  mcp: "MCP",
  post: "帖子",
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?limit=50${filter !== "all" ? `&status=${filter}` : ""}`,
      );
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch {
      // 保持旧列表
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
      return;
    }
    void (async () => {
      await load();
    })();
  }, [user, load, router]);

  const handleResolve = async (id: number, status: "open" | "resolved") => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        window.alert("操作失败，请重试。");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="举报管理"
        description="处理用户对内容的举报，核实后标记完成。"
      />

      <div className="flex flex-wrap gap-2">
        {[
          ["open", "待处理"],
          ["resolved", "已处理"],
          ["all", "全部"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === v
                ? "bg-[#1677ff] text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400 dark:border-zinc-800">
          暂无举报记录。
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {TARGET_LABELS[r.targetType] ?? r.targetType}
                  </span>
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {r.targetTitle || `#${r.targetId}`}
                  </span>
                  {r.status === "resolved" && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      已处理
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  举报原因：{r.reason}
                  {r.reporter ? ` · 举报人 @${r.reporter}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.status === "open" ? (
                  <button
                    onClick={() => handleResolve(r.id, "resolved")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <CheckCircle size={13} /> 标记已处理
                  </button>
                ) : (
                  <button
                    onClick={() => handleResolve(r.id, "open")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-[#1677ff]/40 hover:text-[#1677ff] disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    <Undo2 size={13} /> 重新打开
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
