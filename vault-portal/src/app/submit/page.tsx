"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Wrench,
  MessageSquare,
  Newspaper,
  Plug,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";

const TYPES = [
  { key: "tool", label: "AI 工具", icon: Wrench, desc: "推荐好用的 AI 产品或服务" },
  { key: "prompt", label: "提示词", icon: MessageSquare, desc: "分享高质量 Prompt" },
  { key: "mcp", label: "MCP 服务器", icon: Plug, desc: "推荐实用的 MCP Server" },
  { key: "news", label: "资讯文章", icon: Newspaper, desc: "AI 行业动态和深度文章" },
];

export default function SubmitPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [type, setType] = useState("tool");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const activeType = TYPES.find((t) => t.key === type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          title,
          description: description || undefined,
          content: content || undefined,
          url: url || undefined,
          contact: contact || undefined,
        }),
      });
      if (res.ok) {
        setResult("success");
        setTitle("");
        setDescription("");
        setContent("");
        setUrl("");
        setContact("");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || "提交失败，请重试");
        setResult("error");
      }
    } catch {
      setErrorMsg("网络错误，请稍后重试");
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-300">
          登录后即可提交内容，审核通过后将正式发布。
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
        >
          去登录
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="提交内容"
        description="分享你发现的好工具、好提示词或优质资源，审核通过后正式发布。"
      />

      {result === "success" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle size={18} />
          提交成功！内容已进入审核队列，通过后会通知你。
        </div>
      )}
      {result === "error" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* 类型选择 */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            内容类型
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition ${
                  type === t.key
                    ? "border-[#1677ff] bg-[#1677ff]/5 text-[#1677ff] dark:border-[#5aa0ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]"
                    : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            {activeType.desc}
          </p>
        </div>

        {/* 标题 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            名称 / 标题 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            placeholder="例如：Midjourney 图像生成工具"
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            简介
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="简短描述这个内容的特点和用途"
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>

        {/* 链接 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            相关链接
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>

        {/* 详细内容 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            详细内容（可选）
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={20000}
            placeholder="提示词内容、使用教程、详细介绍等"
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>

        {/* 联系方式 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            联系方式（可选）
          </label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={100}
            placeholder="邮箱 / 微信，方便审核沟通"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1677ff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
          {submitting ? "提交中..." : "提交审核"}
        </button>
      </form>
    </div>
  );
}
