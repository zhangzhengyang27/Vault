"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { X, PencilLine } from "lucide-react";
import type { ToolbarNames } from "md-editor-rt";
import DOMPurify from "dompurify";
import "md-editor-rt/lib/style.css";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";

// md-editor-rt 依赖浏览器环境，仅在客户端加载（与发帖页同一配置）
const MdEditor = dynamic(
  () =>
    import("md-editor-rt").then((m) => {
      m.config({ markdownItConfig: (md) => md.set({ breaks: true }) });
      return m.MdEditor;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60vh] animate-pulse bg-zinc-100 dark:bg-zinc-800" />
    ),
  },
);

const TITLE_MAX = 200;
const CONTENT_MAX = 10000;
const CONTENT_WARN = 9000;

const TOOLBARS: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "link",
  "table",
  "-",
  "revoke",
  "next",
  "save",
  "=",
  "pageFullscreen",
  "preview",
];

interface ApiPost {
  id: number;
  userId: number | null;
  title: string;
  content: string;
  tags: string[] | null;
}

export default function PostEditPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validId = Number.isInteger(postId) && postId > 0;

  useEffect(() => {
    if (!validId) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts/${postId}?count=0`);
        if (!res.ok) {
          setNotAllowed(true);
          return;
        }
        const post: ApiPost = await res.json();
        setTitle(post.title);
        setContent(post.content);
        setTags(post.tags ?? []);
        setOwnerUserId(post.userId);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, validId]);

  // 作者本人或管理员才可编辑（服务端 PUT 仍有权限兜底）
  const allowed =
    !!user && !loading && (user.role === "admin" || user.id === ownerUserId);

  function addTag(raw: string) {
    const t = raw.trim().replace(/[,，]/g, "");
    if (!t) return;
    setTags((prev) =>
      prev.includes(t) || prev.length >= 5 ? prev : [...prev, t],
    );
    setTagInput("");
  }

  const save = useCallback(async () => {
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags: tags.length ? tags : undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push(`/community/${postId}`);
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }, [title, content, tags, saving, postId, router]);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href={`/login?redirect=${encodeURIComponent(`/community/${postId}/edit`)}`}
          className="text-[#1677ff] hover:underline"
        >
          登录
        </Link>
        后才能编辑帖子。
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10">
        <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-[50vh] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center text-sm text-zinc-500 dark:text-zinc-400">
        帖子不存在或已被删除。
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center text-sm text-zinc-500 dark:text-zinc-400">
        只有作者本人或管理员才能编辑此帖子。
      </div>
    );
  }

  const contentNearLimit = content.length >= CONTENT_WARN;

  return (
    <div className="w-full">
      {/* 顶栏 */}
      <div className="flex items-center gap-3">
        <Link
          href={`/community/${postId}`}
          title="返回帖子"
          aria-label="返回帖子"
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <X size={18} />
        </Link>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <PencilLine size={14} /> 编辑帖子
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={save}
          disabled={!title.trim() || !content.trim() || saving}
          className="h-9 rounded-md bg-[#1677ff] px-6 text-sm text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "保存中…" : "保存修改"}
        </button>
      </div>

      {/* 编辑器 */}
      <div className="mt-3 overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="请输入文章标题..."
          className="w-full bg-transparent px-6 pb-4 pt-5 text-2xl font-semibold tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-50 dark:placeholder:text-zinc-600"
        />
        <div className="border-b border-zinc-100 dark:border-zinc-800" />
        {/* 话题标签：回车/逗号成 chip，最多 5 个 */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-6 py-2.5 dark:border-zinc-800">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-[#1677ff]/10 px-2.5 py-1 text-xs text-[#1677ff]"
            >
              #{t}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                title="移除标签"
                className="transition hover:text-[#4096ff]"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === "，") {
                e.preventDefault();
                addTag(tagInput);
              } else if (e.key === "Backspace" && !tagInput && tags.length) {
                setTags((prev) => prev.slice(0, -1));
              }
            }}
            onBlur={() => addTag(tagInput)}
            maxLength={20}
            disabled={tags.length >= 5}
            placeholder={
              tags.length >= 5 ? "最多 5 个标签" : "添加标签，回车确认（最多 5 个）"
            }
            className="min-w-40 flex-1 bg-transparent py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          />
        </div>
        <MdEditor
          id="community-post-editor-edit"
          value={content}
          onChange={(v) => setContent(v ?? "")}
          theme={theme === "dark" ? "dark" : "light"}
          previewTheme="github"
          codeTheme="github"
          toolbars={TOOLBARS}
          footers={["markdownTotal", "=", "scrollSwitch"]}
          placeholder="请输入正文内容，支持 Markdown 语法…"
          noUploadImg
          sanitize={(html) => DOMPurify.sanitize(html)}
          style={{ height: "calc(100vh - 340px)", minHeight: 480 }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
        <span className={contentNearLimit ? "text-amber-500" : ""}>
          {contentNearLimit ? "接近字数上限" : ""}
        </span>
        <span>
          {content.length}/{CONTENT_MAX}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
