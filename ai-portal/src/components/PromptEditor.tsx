"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, Trash2, Plus, ExternalLink } from "lucide-react";

interface Attachment {
  type: string;
  url: string;
  name: string;
}

interface CategoryItem {
  id: number;
  name: string;
  parentId: number | null;
}

export interface PromptDraft {
  slug?: string;
  title: string;
  description: string;
  content: string;
  modelHint: string;
  author: string;
  kind: "general" | "precise";
  categoryId: number | null;
  attachments: Attachment[];
}

const EMPTY: PromptDraft = {
  title: "",
  description: "",
  content: "",
  modelHint: "",
  author: "",
  kind: "general",
  categoryId: null,
  attachments: [],
};

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20";

const selectCls =
  inputCls +
  " disabled:bg-zinc-100 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500";

const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function PromptEditor({
  open,
  initial,
  defaultKind = "general",
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: PromptDraft | null;
  defaultKind?: "general" | "precise";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<PromptDraft>({
    ...EMPTY,
    kind: defaultKind,
  });
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [parentIdSel, setParentIdSel] = useState<number | "">("");
  const [childIdSel, setChildIdSel] = useState<number | "">("");
  const [newCat, setNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatParentId, setNewCatParentId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const d = initial ?? { ...EMPTY, kind: defaultKind };
      void (async () => {
        setDraft(d);
        setError("");
        setNewCat(false);
        setNewCatName("");
        setNewCatSlug("");
        setNewCatParentId("");
      })();
      fetch("/api/categories")
        .then((r) => r.json())
        .then((list) => {
          const arr: CategoryItem[] = Array.isArray(list) ? list : [];
          setCategories(arr);
          if (d.categoryId) {
            const cat = arr.find((c) => c.id === d.categoryId);
            if (cat) {
              if (cat.parentId) {
                setParentIdSel(cat.parentId);
                setChildIdSel(cat.id);
              } else {
                setParentIdSel(cat.id);
                setChildIdSel("");
              }
              return;
            }
          }
          setParentIdSel("");
          setChildIdSel("");
        })
        .catch(() => setCategories([]));
    }
  }, [open, initial, defaultKind]);

  if (!open) return null;

  const parents = categories.filter((c) => c.parentId === null);
  const children =
    parentIdSel === ""
      ? []
      : categories.filter((c) => c.parentId === Number(parentIdSel));

  function set<K extends keyof PromptDraft>(k: K, v: PromptDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    const next = [...draft.attachments];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = await res.json();
        const type = file.type.startsWith("image")
          ? "image"
          : file.type.startsWith("video")
            ? "video"
            : "audio";
        next.push({ type, url: data.url, name: file.name || data.name });
      } catch {
        // 忽略单个文件失败
      }
    }
    set("attachments", next);
  }

  function addLink() {
    let url = linkInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    set("attachments", [...draft.attachments, { type: "link", url, name: "演示" }]);
    setLinkInput("");
  }

  async function submit() {
    setBusy(true);
    setError("");

    // 整个提交流程包在 try 内：分类创建阶段的 401/网络错误也要复位 busy，
    // 否则保存按钮永久停留在「保存中…」
    try {
      let categoryId: number | null =
        childIdSel !== ""
          ? Number(childIdSel)
          : parentIdSel !== ""
            ? Number(parentIdSel)
            : null;

      if (newCat && newCatName.trim()) {
        const slug = newCatSlug.trim() || `cat-${Date.now().toString(36)}`;
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug,
            name: newCatName.trim(),
            parentId: newCatParentId === "" ? null : Number(newCatParentId),
          }),
        });
        if (res.status === 401) {
          throw new Error("请先登录后再操作");
        }
        if (!res.ok) {
          throw new Error("分类创建失败，请检查后重试");
        }
        const saved = await res.json().catch(() => null);
        categoryId = saved?.id ?? categoryId;
      }

      const payload = {
        title: draft.title,
        description: draft.description,
        content: draft.content,
        modelHint: draft.modelHint,
        author: draft.author,
        kind: draft.kind,
        categoryId,
        attachments: draft.attachments,
      };

      const isEdit = !!draft.slug;
      const url = isEdit ? `/api/prompts/${draft.slug}` : "/api/prompts";
      const method = isEdit ? "PATCH" : "POST";

      if (!isEdit) {
        (payload as Record<string, unknown>).slug = `manual-${Date.now().toString(36)}`;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        throw new Error("请先登录后再操作");
      }
      if (!res.ok) throw new Error("保存失败");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-4 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {initial ? "编辑提示词" : "新增提示词"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={labelCls}>标题（可留空）</label>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="例如：生成一张手绘风格的荷花插画"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>一级分类</label>
              <select
                value={parentIdSel}
                onChange={(e) => {
                  const v = e.target.value;
                  setParentIdSel(v === "" ? "" : Number(v));
                  setChildIdSel("");
                }}
                className={selectCls}
              >
                <option value="">未分类</option>
                {parents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>二级分类</label>
              <select
                value={childIdSel}
                disabled={children.length === 0}
                onChange={(e) => {
                  const v = e.target.value;
                  setChildIdSel(v === "" ? "" : Number(v));
                }}
                className={selectCls}
              >
                <option value="">无</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>类型</label>
              <select
                value={draft.kind}
                onChange={(e) =>
                  set("kind", e.target.value as "general" | "precise")
                }
                className={selectCls}
              >
                <option value="general">通用提示词</option>
                <option value="precise">精确提示词</option>
              </select>
            </div>
          </div>

          {!newCat ? (
            <button
              onClick={() => {
                setNewCat(true);
                setNewCatParentId(parentIdSel);
              }}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
            >
              <Plus size={14} /> 新建分类
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <div>
                <label className={labelCls}>新分类名称</label>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className={inputCls}
                  placeholder="如：海报设计"
                />
              </div>
              <div>
                <label className={labelCls}>标识（可留空）</label>
                <input
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className={inputCls}
                  placeholder="poster"
                />
              </div>
              <div>
                <label className={labelCls}>归属一级分类</label>
                <select
                  value={newCatParentId}
                  onChange={(e) =>
                    setNewCatParentId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={selectCls}
                >
                  <option value="">顶级分类</option>
                  {parents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>描述</label>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>提示词内容</label>
            <textarea
              value={draft.content}
              onChange={(e) => set("content", e.target.value)}
              rows={8}
              className={inputCls + " leading-relaxed"}
              placeholder="把完整的提示词粘贴到这里…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>适用模型</label>
              <input
                value={draft.modelHint}
                onChange={(e) => set("modelHint", e.target.value)}
                className={inputCls}
                placeholder="如：Midjourney / Sora"
              />
            </div>
            <div>
              <label className={labelCls}>作者</label>
              <input
                value={draft.author}
                onChange={(e) => set("author", e.target.value)}
                className={inputCls}
                placeholder="可留空"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>附件与演示链接</label>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              支持图片 / 视频 / 音频上传，或粘贴已发布网页的访问链接
            </p>
            <div className="mt-2 space-y-2">
              {draft.attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {a.type === "link" ? "链接" : a.type}
                    </span>
                    <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                      {a.type === "link" ? a.url : a.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.type === "image" && (
                      <img
                        src={a.url}
                        alt={a.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    {a.type === "link" && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="访问演示"
                        className="text-indigo-500 transition hover:text-indigo-400"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() =>
                        set(
                          "attachments",
                          draft.attachments.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-zinc-400 transition hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="粘贴已发布的网页链接，如 https://xxx.com"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                >
                  添加链接
                </button>
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  uploadFiles(e.dataTransfer.files);
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-zinc-300 text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                }`}
              >
                <Upload size={16} />
                {dragOver ? "松开以添加文件" : "上传文件（支持拖拽）"}
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => uploadFiles(e.target.files)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
