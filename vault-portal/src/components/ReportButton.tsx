"use client";

import { useState } from "react";
import { Flag, X, Check } from "lucide-react";

interface ReportButtonProps {
  targetType: string;
  targetId: string | number;
  targetTitle: string;
  className?: string;
}

const REASONS = [
  "内容已失效",
  "信息不准确",
  "涉嫌抄袭",
  "含有违规内容",
  "其他问题",
];

export default function ReportButton({
  targetType,
  targetId,
  targetTitle,
  className = "",
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: Number(targetId),
          targetTitle,
          reason,
        }),
      });
      if (res.status === 401) {
        window.alert("请先登录后再举报。");
        return;
      }
      if (!res.ok) {
        window.alert("举报提交失败，请稍后重试。");
        return;
      }
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason("");
      }, 1500);
    } catch {
      window.alert("举报提交失败，网络异常。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-rose-300 hover:text-rose-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-500/60 dark:hover:text-rose-400"
      >
        <Flag size={13} /> 举报
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {submitted ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                <Check size={20} />
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                举报已提交
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                感谢您的反馈，我们会尽快处理。
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  举报内容
                </h4>
                <button
                  onClick={() => setOpen(false)}
                  className="text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                请选择举报原因：
              </p>
              <div className="space-y-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                      reason === r
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!reason || busy}
                className="mt-3 w-full rounded-lg bg-rose-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "提交中…" : "提交举报"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
