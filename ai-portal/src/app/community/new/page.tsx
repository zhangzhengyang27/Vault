"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { X, FileText } from "lucide-react";
import type { ToolbarNames } from "md-editor-rt";
import DOMPurify from "dompurify";
import "md-editor-rt/lib/style.css";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";

// md-editor-rt 依赖浏览器环境，仅在客户端加载（Next SSR 下会访问 window）
const MdEditor = dynamic(
  () =>
    import("md-editor-rt").then((m) => {
      // breaks：单个换行渲染为 <br>，兼容历史纯文本帖子的换行习惯
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

const DRAFT_KEY = "community-post-draft";
const TITLE_MAX = 200;
const CONTENT_MAX = 10000;
/** 字数接近上限的提醒阈值 */
const CONTENT_WARN = 9000;

/** 工具栏与参考站编辑器对齐：格式排版 + 撤销 + 保存 + 预览，去掉无后端支撑的图片上传 */
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

interface Draft {
  title: string;
  content: string;
  savedAt?: string;
}

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const draftLoaded = useRef(false);

  function addTag(raw: string) {
    const t = raw.trim().replace(/[,，]/g, "");
    if (!t) return;
    setTags((prev) =>
      prev.includes(t) || prev.length >= 5 ? prev : [...prev, t],
    );
    setTagInput("");
  }

  // 匿名访问：登录页支持 ?redirect= 回跳；草稿已先自动落在 localStorage，登录回来不丢
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=%2Fcommunity%2Fnew");
    }
  }, [authLoading, user, router]);

  // 恢复草稿（仅执行一次）：挂载时把 localStorage 里的外部状态同步进 React，
  // 属于 effect 的正当用途；分析器无法识别该场景，块级豁免
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        setTitle(d.title ?? "");
        setContent(d.content ?? "");
        setSavedAt(d.savedAt ?? null);
      }
    } catch {
      /* 草稿损坏时静默忽略 */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveDraft = useCallback(() => {
    if (!title && !content) return;
    const t = nowTime();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ title, content, savedAt: t } satisfies Draft),
    );
    setSavedAt(t);
  }, [title, content]);

  // 草稿自动保存（600ms 防抖）；定时器回调属异步边界，满足 react-hooks 规则
  useEffect(() => {
    const timer = setTimeout(saveDraft, 600);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  const canPublish =
    title.trim().length > 0 && content.trim().length > 0 && !publishing;

  const publish = useCallback(async () => {
    if (!canPublish) return;
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags: tags.length ? tags : undefined,
        }),
      });
      if (res.status === 401) {
        // 会话过期：先落草稿再跳登录，登录后回跳本页可继续编辑
        saveDraft();
        router.push("/login?redirect=%2Fcommunity%2Fnew");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const post = await res.json();
      localStorage.removeItem(DRAFT_KEY);
      // 闭环：发布后直接进入新帖详情页（读者视角即时呈现）
      router.push(`/community/${post.id}`);
    } catch {
      setError("发布失败，请稍后重试（内容已自动保存为草稿）");
    } finally {
      setPublishing(false);
    }
  }, [canPublish, title, content, tags, saveDraft, router]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {authLoading ? "加载中…" : "正在前往登录页…"}
      </div>
    );
  }

  const contentNearLimit = content.length >= CONTENT_WARN;
  const lineCount = content.length === 0 ? 1 : content.split("\n").length;

  return (
    <div className="w-full">
      {/* 顶栏：参考站「标题输入 + 提交」同构，左侧保留返回与草稿状态 */}
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          title="返回社区"
          aria-label="返回社区"
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <X size={18} />
        </Link>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          发布帖子
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <FileText size={13} />
          {savedAt ? `草稿已保存 ${savedAt}` : "草稿将自动保存"}
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={saveDraft}
          className="rounded-md px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          保存草稿
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={!canPublish}
          className="h-9 rounded-md bg-[#1677ff] px-6 text-sm text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishing ? "发布中…" : "发 布"}
        </button>
      </div>

      {/* 编辑器：标题 + Markdown 编辑/预览（md-editor-rt，与参考站同构） */}
      <div className="mt-3 overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="请输入文章标题..."
          autoFocus
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
          id="community-post-editor"
          value={content}
          onChange={(v) => setContent(v ?? "")}
          onSave={() => saveDraft()}
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

      {/* 字数/行数状态条（参考站编辑器底部同款信息位） */}
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-zinc-400 dark:text-zinc-500">
        <span>
          字数: {content.length} 行数: {lineCount}
        </span>
        <span
          className={
            contentNearLimit ? "font-medium text-amber-600 dark:text-amber-400" : ""
          }
        >
          {content.length}/{CONTENT_MAX}
        </span>
      </div>

      {title.length >= TITLE_MAX && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          标题已达上限 {TITLE_MAX} 字
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
