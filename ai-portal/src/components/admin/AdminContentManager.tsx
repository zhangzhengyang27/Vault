"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/lib/auth";
import { adminFetch, CONTENT_STATUS_META, CONTENT_STATUSES } from "@/lib/admin";

export interface AdminFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "tags";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  help?: string;
}

export interface AdminContentTypeConfig {
  type: "tools" | "prompts" | "articles" | "news";
  /** 页面标题，如 "工具管理" */
  title: string;
  /** 描述 */
  description: string;
  /** 标题字段（name/title） */
  titleField: string;
  /** 表单字段 */
  fields: AdminFieldDef[];
  /** 前台详情路径前缀：以 "/" 结尾则拼接 slug，否则原样使用（如知识库聚合页） */
  detailPath: string;
}

interface ListItem {
  id: number;
  slug: string;
  status?: string;
  createdAt?: string;
  category?: { id: number; name: string } | null;
  /** 其余字段由各内容类型的 config.fields 动态决定，取值时再按类型收窄 */
  [key: string]: unknown;
}

const STATUS_TABS = [
  { value: "all", label: "全部" },
  ...CONTENT_STATUSES.map((s) => ({ value: s, label: CONTENT_STATUS_META[s].label })),
];

export default function AdminContentManager({ config }: { config: AdminContentTypeConfig }) {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 搜索输入防抖 300ms，避免每个按键都请求一次后台
  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  // 权限门：双保险（layout 已拦截，这里再拦一次）
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  // 分类列表
  useEffect(() => {
    if (user?.role !== "admin") return;
    adminFetch<{ id: number; name: string }[]>("/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("q", search.trim());
      const data = await adminFetch<{ items: ListItem[]; total: number }>(
        `/admin/content/${config.type}?${params.toString()}`,
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [user, config.type, page, status, search, limit]);

  useEffect(() => {
    void (async () => {
      if (user?.role === "admin") await load();
    })();
  }, [load, user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ status: "published" });
    setEditorOpen(true);
  };

  const openEdit = (item: ListItem) => {
    setEditing(item);
    const f: Record<string, unknown> = { status: item.status ?? "published" };
    for (const field of config.fields) {
      if (item[field.key] !== undefined) f[field.key] = item[field.key];
      else if (field.type === "boolean") f[field.key] = false;
    }
    setForm(f);
    setEditorOpen(true);
  };

  const save = async () => {
    const titleValue = form[config.titleField];
    if (!titleValue || !String(titleValue).trim()) {
      setError(`请填写${config.fields.find((f) => f.key === config.titleField)?.label ?? "标题"}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...form };
      // categoryId：下拉框值是字符串，转为 number；空串表示清空分类（置 null）
      if (body.categoryId !== undefined) {
        body.categoryId =
          body.categoryId === "" || body.categoryId === null
            ? null
            : Number(body.categoryId);
      }
      // tags 字段：逗号分隔转数组
      for (const field of config.fields) {
        const raw = body[field.key];
        if (field.type === "tags" && typeof raw === "string") {
          body[field.key] = raw
            .split(/[,，]/)
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }
      if (editing) {
        await adminFetch(`/admin/content/${config.type}/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch(`/admin/content/${config.type}`, {
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

  const remove = async (item: ListItem) => {
    if (!window.confirm(`确定删除「${String(item[config.titleField])}」吗？此操作不可恢复。`)) return;
    setBusyId(item.id);
    try {
      await adminFetch(`/admin/content/${config.type}/${item.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (item: ListItem, next: string) => {
    setBusyId(item.id);
    try {
      await adminFetch(`/admin/content/${config.type}/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  const detailHref = (item: ListItem) =>
    config.detailPath.endsWith("/")
      ? `${config.detailPath}${encodeURIComponent(item.slug)}`
      : config.detailPath;

  if (user?.role !== "admin") return null;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff]"
          >
            <Plus size={15} /> 新建
          </button>
        }
      />

      {/* 筛选栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                status === t.value
                  ? "bg-[#1677ff] text-white dark:bg-[#1677ff]"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="搜索标题…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20 sm:w-56"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">没有符合条件的内容</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                {config.type !== "news" && <th className="hidden px-4 py-3 font-medium sm:table-cell">分类</th>}
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">ID</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">创建时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item) => {
                const statusMeta = CONTENT_STATUS_META[item.status ?? ""] ?? CONTENT_STATUS_META.draft;
                return (
                  <tr key={item.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={detailHref(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 truncate font-medium text-zinc-900 hover:text-[#1677ff] dark:text-zinc-100 dark:hover:text-[#5aa0ff]"
                        >
                          <span className="truncate">{String(item[config.titleField] ?? "")}</span>
                          <ExternalLink size={12} className="shrink-0 text-zinc-400" />
                        </a>
                      </div>
                    </td>
                    {config.type !== "news" && (
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {item.category?.name ?? "—"}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-400 md:table-cell">#{item.id}</td>
                    <td className="hidden px-4 py-3 text-xs text-zinc-400 lg:table-cell">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {item.status !== "published" && (
                          <button
                            onClick={() => toggleStatus(item, "published")}
                            disabled={busyId === item.id}
                            title="发布"
                            className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        {item.status === "published" && (
                          <button
                            onClick={() => toggleStatus(item, "draft")}
                            disabled={busyId === item.id}
                            title="下架（转草稿）"
                            className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50 disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-500/10"
                          >
                            <EyeOff size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          title="编辑"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => remove(item)}
                          disabled={busyId === item.id}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-500/10"
                          title="删除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / limit))}
        onPageChange={setPage}
      />

      {/* 新建/编辑弹窗 */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {editing ? "编辑" : "新建"}{config.title.slice(0, -2)}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              {config.fields.map((field) => (
                <div key={field.key} className={field.full ? "sm:col-span-2" : ""}>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-rose-500">*</span>}
                  </label>
                  <FormField
                    field={field}
                    value={form[field.key]}
                    categories={categoryOptions}
                    onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                  />
                  {field.help && (
                    <p className="mt-1 text-xs text-zinc-400">{field.help}</p>
                  )}
                </div>
              ))}
            </div>
            {error && (
              <div className="px-6 pb-2">
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </div>
              </div>
            )}
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

/** 受控输入的 value 只接受 string/number/数组，其余值按 React 的赋值语义转成字符串 */
function toInputValue(v: unknown): string | number | readonly string[] {
  if (typeof v === "string" || typeof v === "number" || Array.isArray(v)) return v;
  return String(v);
}

function FormField({
  field,
  value,
  categories,
  onChange,
}: {
  field: AdminFieldDef;
  value: unknown;
  categories: { value: number; label: string }[];
  onChange: (v: unknown) => void;
}) {
  const base =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20";
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={toInputValue(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder={field.placeholder}
          className={`${base} leading-relaxed`}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={toInputValue(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={base}
        />
      );
    case "boolean":
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-[#1677ff] focus:ring-[#1677ff]"
          />
          <span className="text-sm text-zinc-600 dark:text-zinc-300">是</span>
        </label>
      );
    case "select": {
      const options =
        field.key === "categoryId"
          ? categories
          : (field.options ?? []);
      return (
        <select value={toInputValue(value ?? "")} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">请选择…</option>
          {options.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case "tags":
      return (
        <input
          value={Array.isArray(value) ? value.join(", ") : toInputValue(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="多个标签用逗号分隔"
          className={base}
        />
      );
    default:
      return (
        <input
          value={toInputValue(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      );
  }
}
