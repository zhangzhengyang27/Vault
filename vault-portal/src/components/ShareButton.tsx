"use client";

import { useState } from "react";
import { Share2, Copy, Check, Link2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  url?: string;
  className?: string;
}

export default function ShareButton({ title, url, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // user cancelled
      }
    }
    setOpen(!open);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Share2 size={13} /> 分享
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {copied ? (
              <>
                <Check size={15} className="text-emerald-500" /> 已复制链接
              </>
            ) : (
              <>
                <Copy size={15} /> 复制链接
              </>
            )}
          </button>
          <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <Link2 size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {shareUrl}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
