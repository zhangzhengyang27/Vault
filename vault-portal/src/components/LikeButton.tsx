"use client";

import { useState, useEffect } from "react";
import { ThumbsUp } from "lucide-react";

interface LikeButtonProps {
  targetType: string;
  targetId: string | number;
  initialCount?: number;
  className?: string;
}

const STORAGE_KEY = "vault-portal-likes";

export default function LikeButton({
  targetType,
  targetId,
  initialCount = 0,
  className = "",
}: LikeButtonProps) {
  const key = `${targetType}:${targetId}`;
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const likes = raw ? JSON.parse(raw) : {};
        if (likes[key]) {
          setLiked(true);
          setCount((prev) => prev + 1);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [key]);

  const toggle = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const likes = raw ? JSON.parse(raw) : {};
      if (liked) {
        delete likes[key];
        setCount((prev) => Math.max(0, prev - 1));
      } else {
        likes[key] = true;
        setCount((prev) => prev + 1);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
      setLiked(!liked);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        liked
          ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400"
          : "border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500/60 dark:hover:text-indigo-400"
      } ${className}`}
    >
      <ThumbsUp size={13} fill={liked ? "currentColor" : "none"} />
      {count > 0 && <span>{count}</span>}
      <span>{liked ? "已点赞" : "有用"}</span>
    </button>
  );
}
