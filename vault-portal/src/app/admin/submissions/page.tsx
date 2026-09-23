"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  MessageSquare,
  Plug,
  FolderOpen,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";

interface Submission {
  id: number;
  type: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  contact?: string;
  status: string;
  userId: number;
  createdAt: string;
  reviewedAt?: string;
  rejectReason?: string;
}

const TYPE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  tool: { label: "工具", icon: Wrench, color: "text-[#1677ff] bg-[#1677ff]/10 dark:bg-blue-500/10" },
  prompt: { label: "提示词", icon: MessageSquare, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
  mcp: { label: "MCP", icon: Plug, color: "text-[#1677ff] bg-[#1677ff]/10 dark:bg-[#1677ff]/10" },
  resource: { label: "资源", icon: FolderOpen, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
  news: { label: "资讯", icon: Newspaper, color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10" },
};

const STATUS_META: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  pending: { label: "待审核", color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400", icon: Clock },
  approved: { label: "已通过", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400", icon: CheckCircle },
  rejected: { label: "已拒绝", color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400", icon: XCircle },
};

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState<number | null>(null);

  // useCallback 稳定引用，使其能安全进入下方 effect 的依赖数组
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/submissions/admin/list${filter !== "all" ? `?status=${filter}` : ""}`,
        {},
      );
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/");
      return;
    }
    void (async () => {
      await load();
    })();
  }, [user, load, router]);

  const handleApprove = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/submissions/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        window.alert("操作失败，请重试。");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt("拒绝原因（可选）：");
    if (reason === null) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/submissions/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        window.alert("操作失败，请重试。");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="内容审核"
        description="审核用户提交的工具、提示词、MCP、资源和资讯。"
      />

      {/* 筛选 */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === s
                ? "bg-[#1677ff] text-white dark:bg-[#1677ff]"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
            }`}
          >
            {STATUS_META[s]?.label ?? "全部"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filter === "pending" ? "暂无待审核内容" : "没有符合条件的记录"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const typeMeta = TYPE_META[item.type] ?? TYPE_META.tool;
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.pending;
            const TypeIcon = typeMeta.icon;
            const StatusIcon = statusMeta.icon;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${typeMeta.color}`}
                      >
                        <TypeIcon size={11} />
                        {typeMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.color}`}
                      >
                        <StatusIcon size={11} />
                        {statusMeta.label}
                      </span>
                      <span className="text-xs text-zinc-400">
                        #{item.id} · {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {item.description}
                      </p>
                    )}
                    {item.content && (
                      <p className="mt-2 line-clamp-3 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                        {item.content}
                      </p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[#1677ff] hover:underline dark:text-[#5aa0ff]"
                      >
                        <ExternalLink size={11} />
                        {item.url}
                      </a>
                    )}
                    {item.rejectReason && (
                      <p className="mt-2 text-xs text-red-500">
                        拒绝原因：{item.rejectReason}
                      </p>
                    )}
                  </div>

                  {item.status === "pending" && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle size={13} /> 通过
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                      >
                        <XCircle size={13} /> 拒绝
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
