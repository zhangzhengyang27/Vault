"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Pencil,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import PromptEditor from "@/components/PromptEditor";
import type { PromptDraft } from "@/components/PromptEditor";
import Markdown from "@/components/Markdown";
import DetailLayout from "@/components/DetailLayout";
import ShareButton from "@/components/ShareButton";
import HistoryTracker from "@/components/HistoryTracker";
import { copyToClipboard } from "@/lib/clipboard";
import { useAuth } from "@/lib/auth";
import { clearListCache } from "@/lib/promptListState";
import { safeExternalUrl, safeInternalPath } from "@/lib/safeUrl";

interface ApiPrompt {
  id: number;
  slug: string;
  title: string;
  description: string;
  content: string;
  optimizedContent?: string | null;
  category?: { id: number; name: string } | null;
  kind?: "general" | "precise";
  modelHint: string;
  author: string;
  uses: number;
  phase: string;
  source?: string;
  attachments?: { type: string; url: string; name: string }[] | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RelatedPrompt {
  slug: string;
  title: string;
  description: string;
}

export default function PromptDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [prompt, setPrompt] = useState<ApiPrompt | null>(null);
  const [related, setRelated] = useState<RelatedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copiedOpt, setCopiedOpt] = useState(false);
  const [copiedNeg, setCopiedNeg] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const { user } = useAuth();
  // PATCH/DELETE 均 admin-only，入口对非管理员隐藏
  const isAdmin = user?.role === "admin";
  // 每次浏览只把首次复制计为一次使用，避免反复复制刷量
  const useCountedRef = useRef(false);
  // 附件缺失时的演示入口兜底：slug 与 public/demos/ 下同名 html 匹配即展示
  const [fallbackDemo, setFallbackDemo] = useState<string | null>(null);
  useEffect(() => {
    const url = `/demos/${slug}.html`;
    let alive = true;
    fetch(url, { method: "HEAD" }).then((res) => {
      if (alive && res.ok) setFallbackDemo(url);
      else if (alive) setFallbackDemo(null);
    });
    return () => {
      alive = false;
      setFallbackDemo(null);
    };
  }, [slug]);

  const countUse = () => {
    if (useCountedRef.current) return;
    useCountedRef.current = true;
    fetch(`/api/prompts/${encodeURIComponent(slug)}/use`, {
      method: "POST",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.uses === "number") {
          setPrompt((p) => (p ? { ...p, uses: d.uses } : p));
        }
      })
      .catch(() => {});
  };

  const copyOptimized = async () => {
    const text = optPositive;
    if (!text) return;
    if (await copyToClipboard(text)) {
      setCopiedOpt(true);
      setTimeout(() => setCopiedOpt(false), 1500);
      countUse();
    }
  };

  const copyNegative = async () => {
    const text = optNegative;
    if (!text) return;
    if (await copyToClipboard(text)) {
      setCopiedNeg(true);
      setTimeout(() => setCopiedNeg(false), 1500);
    }
  };

  const copyBody = async () => {
    const text = prompt?.content ?? "";
    if (!text) return;
    if (await copyToClipboard(text)) {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 1500);
      countUse();
    }
  };

  // 侧栏「复制提示词」：优先复制优化版，无优化版时复制原文
  const copyPrimary = () => (optPositive ? copyOptimized() : copyBody());

  const load = useCallback(async () => {
    const res = await fetch(`/api/prompts/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      setMissing(true);
      return;
    }
    const data: ApiPrompt = await res.json();
    setPrompt(data);

    // 同类提示词推荐：同分类下排除当前条目（图片/网页提示词按 media 收敛）
    const catName = data.category?.name;
    if (!catName) {
      setRelated([]);
      return;
    }
    const params = new URLSearchParams({ category: catName, limit: "6" });
    if (data.kind) params.set("kind", data.kind);
    const hasImage = (data.attachments ?? []).some((a) => a.type === "image");
    if (hasImage) params.set("media", "image");
    else if (data.kind === "precise") params.set("media", "text");
    fetch(`/api/prompts?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const items: RelatedPrompt[] = Array.isArray(list) ? list : list.items ?? [];
        setRelated(items.filter((p) => p.slug !== data.slug).slice(0, 5));
      })
      .catch(() => setRelated([]));
  }, [slug]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        setMissing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const optPositive = prompt?.optimizedContent
    ? prompt.optimizedContent.split(/\n\s*Negative prompt:\s*/i)[0].trim()
    : "";
  const optNegative = (() => {
    if (!prompt?.optimizedContent) return "";
    const parts = prompt.optimizedContent.split(/\n\s*Negative prompt:\s*/i);
    return parts[1]?.trim() ?? "";
  })();

  const isWebGen = useMemo(
    () => prompt?.category?.name === "网页生成",
    [prompt]
  );

  if (loading) {
    return (
      <div className="mx-auto h-48 max-w-6xl animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    );
  }

  if (missing || !prompt) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg bg-white py-20 text-center dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">内容未找到。</p>
        <Link
          href="/prompts"
          className="mt-4 inline-block text-sm font-medium text-[#1677ff] transition hover:text-[#4096ff] dark:text-[#5aa0ff]"
        >
          返回 AI 提示词
        </Link>
      </div>
    );
  }

  const draft: PromptDraft = {
    slug: prompt.slug,
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    modelHint: prompt.modelHint,
    author: prompt.author,
    kind: prompt.kind ?? "general",
    categoryId: prompt.category?.id ?? null,
    attachments: prompt.attachments ?? [],
  };

  // 演示链接：优先取附件里的外链或站内 /demos/ 路径（历史数据多为相对路径，
  // 之前被 safeExternalUrl 整体拦掉导致「访问演示」按钮不渲染），无附件回退 HEAD 探测
  const demoLink =
    prompt.attachments
      ?.filter((a) => a.type === "link")
      .map((a) => safeExternalUrl(a.url) ?? safeInternalPath(a.url))
      .find((u): u is string => !!u) ?? fallbackDemo;
  const title = prompt.title.trim() || "无标题";

  const main = (
    <>
      {/* 主信息卡：参考站文章式详情（渐变圆标 + 标题 + 简介 + 标签药丸） */}
      <div className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff]/90 to-[#69b1ff]/90 text-xl font-bold text-white">
            {title.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {prompt.description}
            </p>
          </div>
        </div>

      </div>

      {/* 提示词正文 */}
      {prompt.content && (
        <div className="rounded-lg bg-white dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              提示词正文
            </h2>
            <button
              onClick={copyBody}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1677ff] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#4096ff]"
            >
              {copiedBody ? (
                <>
                  <Check size={13} /> 已复制
                </>
              ) : (
                <>
                  <Copy size={13} /> 复制提示词
                </>
              )}
            </button>
          </div>
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            {isWebGen ? (
              <Markdown>{prompt.content}</Markdown>
            ) : (
              <p className="whitespace-pre-wrap text-base leading-7 text-zinc-800 dark:text-zinc-200">
                {prompt.content}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 优化版提示词 */}
      {prompt.optimizedContent ? (
        <div className="rounded-lg bg-white dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <Sparkles size={14} className="text-[#1677ff] dark:text-[#5aa0ff]" />
              {isWebGen
                ? "优化版提示词（AI Coding 专用）"
                : "优化版提示词（正向 · 高质量出图）"}
            </h2>
            <button
              onClick={copyOptimized}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                isWebGen
                  ? "bg-[#1677ff] text-white hover:bg-[#4096ff]"
                  : "border border-[#1677ff]/40 text-[#1677ff] hover:bg-[#1677ff]/10 dark:border-[#5aa0ff]/40 dark:text-[#5aa0ff]"
              }`}
            >
              {copiedOpt ? (
                <>
                  <Check size={13} /> 已复制
                </>
              ) : (
                <>
                  <Copy size={13} /> {isWebGen ? "复制完整提示词" : "复制正向提示词"}
                </>
              )}
            </button>
          </div>
          <div className="px-5 py-6 sm:px-6">
            {isWebGen ? (
              <Markdown>{optPositive}</Markdown>
            ) : (
              <pre className="whitespace-pre-wrap rounded-md bg-zinc-50 p-4 text-sm leading-7 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
                {optPositive}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white px-5 py-5 text-xs text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500 sm:px-6">
          {isWebGen
            ? "暂无优化版。可直接复制上方内容交给 AI 编程工具（Cursor / Claude / v0 等）生成网页。"
            : "暂无优化版。该提示词不是图片生成类内容（如报告 / 文档 / 视频脚本），无需出图优化。"}
        </div>
      )}

      {/* 负向提示词 */}
      {!isWebGen && optNegative && (
        <div className="rounded-lg bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              推荐负向提示词（粘到反向/负向框）
            </h2>
            <button
              onClick={copyNegative}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
            >
              {copiedNeg ? (
                <>
                  <Check size={13} /> 已复制
                </>
              ) : (
                <>
                  <Copy size={13} /> 复制负向提示词
                </>
              )}
            </button>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <pre className="whitespace-pre-wrap rounded-md bg-zinc-50 p-4 text-sm leading-7 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
              {optNegative}
            </pre>
          </div>
        </div>
      )}
    </>
  );

  const primaryCopied = optPositive ? copiedOpt : copiedBody;

  const sidebar = (
    <>
      {/* 同类提示词推荐（参考站侧栏同款：名称 + 描述列表） */}
      {related.length > 0 && (
        <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            同类提示词
          </h3>
          <ul className="mt-3 space-y-3">
            {related.map((rp) => (
              <li key={rp.slug}>
                <Link href={`/prompts/${rp.slug}`} className="group block">
                  <p className="truncate text-sm text-zinc-700 transition group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                    {rp.title.trim() || "无标题"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {rp.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 操作卡 */}
      <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
        <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          操作
        </h3>
        <div className="space-y-2">
          {demoLink && (
            <a
              href={demoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#1677ff] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#4096ff]"
            >
              <ExternalLink size={14} /> 访问演示
            </a>
          )}
          {(optPositive || prompt.content) && (
            <button
              onClick={copyPrimary}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-[#5aa0ff]/60 dark:hover:text-[#5aa0ff]"
            >
              {primaryCopied ? <Check size={14} /> : <Copy size={14} />}
              {primaryCopied ? "已复制" : "复制提示词"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setEditorOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-[#5aa0ff]/60 dark:hover:text-[#5aa0ff]"
            >
              <Pencil size={14} /> 编辑
            </button>
          )}
          <div className="pt-1">
            <FavoriteButton targetType="prompt" targetId={prompt.id} />
          </div>
          <ShareButton title={prompt.title} />
        </div>
      </div>

    </>
  );

  return (
    <>
      <HistoryTracker type="prompt" slug={prompt.slug} title={prompt.title} path={`/prompts/${prompt.slug}`} />
      <DetailLayout
        breadcrumb={[
          { label: "AI 提示词", href: "/prompts" },
          { label: title },
        ]}
        main={main}
        sidebar={sidebar}
      />
      <PromptEditor
        open={editorOpen}
        initial={draft}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          // 编辑可能改了标题/描述，列表页缓存的数据已过期，直接失效
          clearListCache();
          load();
        }}
      />
    </>
  );
}
