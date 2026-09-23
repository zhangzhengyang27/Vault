"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Wrench,
  MessageSquare,
  Newspaper,
  FolderOpen,
  GitBranch,
  CheckCheck,
  XOctagon,
  Server,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/admin";

interface QueueItem {
  id: number;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  url?: string;
  status: string;
  createdAt?: string;
}

interface TypeMeta {
  label: string;
  icon: LucideIcon;
  titleField: "title" | "name";
  color: string;
}

const TYPE_META: Record<string, TypeMeta> = {
  news: { label: "资讯", icon: Newspaper, titleField: "title", color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10" },
  tool: { label: "工具", icon: Wrench, titleField: "name", color: "text-[#1677ff] bg-[#1677ff]/10 dark:bg-blue-500/10" },
  prompt: { label: "提示词", icon: MessageSquare, titleField: "title", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
  github: { label: "GitHub", icon: GitBranch, titleField: "name", color: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300" },
  knowledge: { label: "知识库", icon: FolderOpen, titleField: "title", color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
  mcp: { label: "MCP", icon: Server, titleField: "name", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10" },
  resource: { label: "学习资源", icon: BookOpen, titleField: "title", color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
};

const TYPE_KEYS = Object.keys(TYPE_META);

interface BatchResult {
  updated: number;
  remaining: number;
}

export default function AdminReviewPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [type, setType] = useState("news");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  // 切换内容类型时清空选择，避免把上一类的 id 带过去
  useEffect(() => {
    void (async () => {
      setSelected(new Set());
    })();
  }, [type]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<QueueItem[]>(
        `/crawler/review/${type}?status=pending`,
      );
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, type]);

  useEffect(() => {
    void (async () => {
      if (user?.role === "admin") await load();
    })();
  }, [load, user]);

  const review = async (id: number, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await adminFetch(`/crawler/review/${type}/${id}/${action}`, {
        method: "PATCH",
      });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  /**
   * 批量审核。scope=selected 只处理勾选项；scope=all 处理该类型全部待审
   * （后端单次上限 500，剩余部分可再次点击继续）。
   */
  const runBulk = async (action: "approve" | "reject", scope: "selected" | "all") => {
    const ids = scope === "selected" ? Array.from(selected) : undefined;
    if (scope === "selected" && (!ids || ids.length === 0)) return;

    const verb = action === "approve" ? "通过" : "拒绝";
    const target =
      scope === "all"
        ? `当前全部待审的${meta.label}（每次最多 500 条）`
        : `选中的 ${ids!.length} 条${meta.label}`;
    if (!window.confirm(`确认${verb}${target}？`)) return;

    setBulkBusy(true);
    try {
      const res = await adminFetch<BatchResult>(`/crawler/review/${type}/batch`, {
        method: "POST",
        body: JSON.stringify({ action, ids }),
      });
      setSelected(new Set());
      await load();
      if (res.remaining > 0) {
        alert(
          `本次${verb} ${res.updated} 条，队列还剩 ${res.remaining} 条待审，可再次点击「全部${verb}」继续。`,
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "批量操作失败");
    } finally {
      setBulkBusy(false);
    }
  };

  const meta = TYPE_META[type];
  const titleOf = useMemo(
    () => (item: QueueItem) =>
      (meta.titleField === "name" ? item.name : item.title) ??
      item.title ??
      item.name ??
      item.slug,
    [meta.titleField],
  );

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <PageHeader title="审核中心" description="处理用户投稿与采集内容的发布审核。" />

      {/* 用户投稿入口 */}
      <Link
        href="/admin/submissions"
        className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#1677ff]/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#5aa0ff]/40"
      >
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            用户投稿审核
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            用户提交的工具、提示词、MCP、资源、资讯，审核通过后自动发布
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-zinc-400" />
      </Link>

      {/* 采集内容审核 */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            采集内容审核
          </h3>
          <div className="flex flex-wrap gap-2">
            {TYPE_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setType(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  type === k
                    ? "bg-[#1677ff] text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
                }`}
              >
                {TYPE_META[k].label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="border-b border-zinc-100 px-5 py-3 text-sm text-rose-600 dark:border-zinc-800 dark:text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center">
            <Clock size={28} className="mx-auto text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              暂无待审核的{meta.label}内容
            </p>
          </div>
        ) : (
          <>
            {/* 批量操作条 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-zinc-300 accent-[#1677ff] dark:border-zinc-600"
                />
                全选（本页 {items.length} 条待审
                {selected.size > 0 && ` · 已选 ${selected.size}`}）
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runBulk("approve", "selected")}
                  disabled={bulkBusy || selected.size === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle size={13} /> 通过所选
                </button>
                <button
                  onClick={() => runBulk("reject", "selected")}
                  disabled={bulkBusy || selected.size === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  <XCircle size={13} /> 拒绝所选
                </button>
                <span className="mx-1 hidden w-px self-stretch bg-zinc-200 sm:block dark:bg-zinc-700" />
                <button
                  onClick={() => runBulk("approve", "all")}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  <CheckCheck size={13} /> 全部通过
                </button>
                <button
                  onClick={() => runBulk("reject", "all")}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <XOctagon size={13} /> 全部拒绝
                </button>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {items.map((item) => {
                const title = titleOf(item);
                const TypeIcon = meta.icon;
                const checked = selected.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition ${
                      checked
                        ? "border-[#1677ff]/40 bg-[#1677ff]/5 dark:border-[#5aa0ff]/40 dark:bg-[#1677ff]/5"
                        : "border-zinc-100 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex min-w-0 gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`选择 #${item.id}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 accent-[#1677ff] dark:border-zinc-600"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.color}`}
                          >
                            <TypeIcon size={11} />
                            {meta.label}
                          </span>
                          <span className="text-xs text-zinc-400">#{item.id}</span>
                        </div>
                        <h4 className="mt-1.5 font-medium text-zinc-900 dark:text-zinc-50">{title}</h4>
                        {(item.description || item.summary) && (
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                            {item.description ?? item.summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => review(item.id, "approve")}
                        disabled={busyId === item.id || bulkBusy}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle size={13} /> 通过
                      </button>
                      <button
                        onClick={() => review(item.id, "reject")}
                        disabled={busyId === item.id || bulkBusy}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                      >
                        <XCircle size={13} /> 拒绝
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
