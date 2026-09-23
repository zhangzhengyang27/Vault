"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Play,
  RefreshCw,
  Power,
  Activity,
  ScrollText,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/admin";

interface Source {
  id: number;
  name: string;
  url: string;
  sourceType: string;
  crawlInterval: string;
  enabled: boolean;
  status: string;
  description?: string | null;
  lastError: string;
  lastCrawledAt?: string | null;
  successCount: number;
  failCount: number;
  createdAt: string;
}

/** 全量采集接口可能回纯文本也可能回 JSON，此处只在纯文本时透传提示文案 */
type CrawlRunResult = string | Record<string, unknown>;

interface CrawlLog {
  id: number;
  sourceId?: number | null;
  sourceName?: string;
  status?: string;
  message?: string;
  createdAt?: string;
  level?: string;
  type?: string;
}

const TYPE_META: Record<string, string> = {
  news: "资讯",
  tool: "工具",
  prompt: "提示词",
  github: "GitHub",
  knowledge: "知识库",
};

const INTERVAL_META: Record<string, string> = {
  minutely: "每分钟",
  hourly: "每小时",
  daily: "每天",
  weekly: "每周",
};

const TYPE_OPTIONS = [
  { value: "news", label: "资讯" },
  { value: "tool", label: "工具" },
  { value: "prompt", label: "提示词" },
  { value: "github", label: "GitHub" },
  { value: "knowledge", label: "知识库" },
];

const INTERVAL_OPTIONS = [
  { value: "minutely", label: "每分钟" },
  { value: "hourly", label: "每小时" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
];

const EMPTY_FORM = {
  name: "",
  url: "",
  sourceType: "news",
  crawlInterval: "daily",
  enabled: true,
  description: "",
};

export default function AdminSourcesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<Source[]>([]);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [srcs, lg] = await Promise.all([
        adminFetch<Source[]>("/crawler/sources"),
        adminFetch<CrawlLog[]>("/crawler/logs?limit=20"),
      ]);
      setItems(Array.isArray(srcs) ? srcs : []);
      setLogs(Array.isArray(lg) ? lg : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void (async () => {
      if (user?.role === "admin") await load();
    })();
  }, [load, user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  };

  const openEdit = (s: Source) => {
    setEditing(s);
    setForm({
      name: s.name,
      url: s.url,
      sourceType: s.sourceType,
      crawlInterval: s.crawlInterval,
      enabled: s.enabled,
      description: s.description ?? "",
    });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError("请填写名称和 URL");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        url: form.url.trim(),
        sourceType: form.sourceType,
        crawlInterval: form.crawlInterval,
        enabled: form.enabled,
        description: form.description.trim() || undefined,
      };
      if (editing) {
        await adminFetch(`/crawler/sources/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch("/crawler/sources", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setEditorOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Source) => {
    if (!window.confirm(`确定删除数据源「${s.name}」吗？`)) return;
    setBusyId(s.id);
    try {
      await adminFetch(`/crawler/sources/${s.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (s: Source) => {
    setBusyId(s.id);
    try {
      await adminFetch(`/crawler/sources/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  const runAll = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await adminFetch<CrawlRunResult>("/crawler/run", { method: "POST" });
      alert(typeof res === "string" ? res : "已触发全量采集");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "触发失败");
    } finally {
      setRunning(false);
    }
  };

  const runOne = async (s: Source) => {
    setBusyId(s.id);
    try {
      await adminFetch(`/crawler/sources/${s.id}/run`, { method: "POST" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "采集失败");
    } finally {
      setBusyId(null);
    }
  };

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="数据源管理"
        description="维护采集白名单数据源，控制采集频率与启停状态。"
        actions={
          <div className="flex gap-2">
            <button
              onClick={runAll}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-800"
            >
              <Play size={14} /> 全量采集
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff]"
            >
              <Plus size={15} /> 新增数据源
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无数据源，点击右上角新增</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{s.name}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {TYPE_META[s.sourceType] ?? s.sourceType}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {INTERVAL_META[s.crawlInterval] ?? s.crawlInterval}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      s.enabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    <Activity size={10} />
                    {s.enabled ? "启用中" : "已停用"}
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl truncate text-sm text-zinc-500 dark:text-zinc-400">{s.url}</p>
                {s.description && (
                  <p className="mt-1 text-xs text-zinc-400">{s.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                  <span>成功 {s.successCount}</span>
                  <span>失败 {s.failCount}</span>
                  {s.lastCrawledAt && (
                    <span>上次采集 {new Date(s.lastCrawledAt).toLocaleString("zh-CN")}</span>
                  )}
                  {s.lastError && <span className="text-rose-500">错误：{s.lastError}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => runOne(s)}
                  disabled={busyId === s.id}
                  title="手动采集"
                  className="rounded-lg p-1.5 text-[#1677ff] transition hover:bg-[#1677ff]/10 disabled:opacity-40 dark:text-[#5aa0ff] dark:hover:bg-[#5aa0ff]/10"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => toggleEnabled(s)}
                  disabled={busyId === s.id}
                  title={s.enabled ? "停用" : "启用"}
                  className={`rounded-lg p-1.5 transition disabled:opacity-40 ${s.enabled ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10" : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"}`}
                >
                  <Power size={15} />
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  title="编辑"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => remove(s)}
                  disabled={busyId === s.id}
                  className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-500/10"
                  title="删除"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 采集日志 */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setShowLogs((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">最近采集日志</h3>
          </div>
          <span className="text-xs text-zinc-400">{showLogs ? "收起" : "展开"}</span>
        </button>
        {showLogs && (
          <div className="max-h-80 overflow-y-auto border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">暂无日志</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 text-zinc-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN") : ""}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${
                        log.status === "success" || log.level === "log"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : log.status === "error" || log.level === "error"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {log.status ?? log.level ?? "info"}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {log.sourceName ? `[${log.sourceName}] ` : ""}
                      {log.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {editing ? "编辑数据源" : "新增数据源"}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <Field label="名称">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="如 OpenAI 官方博客"
                  className={inputCls}
                />
              </Field>
              <Field label="URL">
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://…/rss.xml"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="内容类型">
                  <select
                    value={form.sourceType}
                    onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value }))}
                    className={inputCls}
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="采集频率">
                  <select
                    value={form.crawlInterval}
                    onChange={(e) => setForm((f) => ({ ...f, crawlInterval: e.target.value }))}
                    className={inputCls}
                  >
                    {INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="描述">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className={inputCls}
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-[#1677ff] focus:ring-[#1677ff]"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-300">启用该数据源</span>
              </label>
              {error && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff] disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}
