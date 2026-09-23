"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        页面加载出错了
      </h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        发生了未知错误，请稍后重试。
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
          错误编号：{error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-[#1677ff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4096ff]"
      >
        重新加载
      </button>
    </div>
  );
}
