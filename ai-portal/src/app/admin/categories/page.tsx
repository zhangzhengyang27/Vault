"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/admin";

interface Category {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
}

const EMPTY_FORM = { slug: "", name: "", parentId: "" as string | number, sortOrder: 0 };

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<Category[]>("/categories");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      if (user?.role === "admin") await load();
    })();
  }, [load, user]);

  const nameOf = (id: number | null) =>
    id == null ? null : items.find((c) => c.id === id)?.name ?? `#${id}`;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      slug: c.slug,
      name: c.name,
      parentId: c.parentId ?? "",
      sortOrder: c.sortOrder,
    });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError("请填写名称和 Slug");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        parentId: form.parentId === "" ? null : Number(form.parentId),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await adminFetch(`/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch("/categories", {
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

  const remove = async (c: Category) => {
    if (!window.confirm(`确定删除分类「${c.name}」吗？`)) return;
    setBusyId(c.id);
    try {
      await adminFetch(`/categories/${c.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  };

  if (user?.role !== "admin") return null;

  const parentOptions = items.filter((c) => c.id !== editing?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="分类管理"
        description="维护站点栏目与分类体系，支持上下级与排序。"
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff]"
          >
            <Plus size={15} /> 新增分类
          </button>
        }
      />

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无分类</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">上级分类</th>
                <th className="px-4 py-3 font-medium">排序</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((c) => (
                <tr key={c.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</span>
                      {c.parentId == null && (
                        <span className="rounded-full bg-[#1677ff]/10 px-2 py-0.5 text-[10px] font-medium text-[#1677ff] dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]">
                          一级
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{c.slug}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {nameOf(c.parentId) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        title="编辑"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(c)}
                        disabled={busyId === c.id}
                        className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-500/10"
                        title="删除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {editing ? "编辑分类" : "新增分类"}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">名称</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="如 AI 工具"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className={inputCls}
                  placeholder="如 ai-tools"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">上级分类</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">无（一级分类）</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">排序</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
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
