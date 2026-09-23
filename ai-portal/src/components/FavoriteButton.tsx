"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface FavoriteItem {
  id: number;
  targetType: string;
  targetId: number;
}

export default function FavoriteButton({
  targetType,
  targetId,
  targetSlug,
  title,
}: {
  targetType: string;
  targetId: number;
  targetSlug?: string;
  title?: string;
}) {
  const { user } = useAuth();
  const [favId, setFavId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetch("/api/favorites", {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? (data as FavoriteItem[]) : [];
        const match = list.find(
          (f) =>
            f.targetType === targetType && Number(f.targetId) === Number(targetId),
        );
        setFavId(match?.id ?? null);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setFavId(null);
      });
    return () => controller.abort();
  }, [user, targetType, targetId]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-amber-300 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500/60 dark:hover:text-amber-400"
      >
        <Star size={14} /> 登录后收藏
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    try {
      if (favId) {
        await fetch(`/api/favorites/${favId}`, {
          method: "DELETE",
        });
        setFavId(null);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetType, targetId, targetSlug, title }),
        });
        if (res.ok) {
          const saved = await res.json();
          setFavId(saved.id);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        favId
          ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          : "border border-zinc-200 text-zinc-600 hover:border-amber-300 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500/60 dark:hover:text-amber-400"
      }`}
    >
      <Star size={14} fill={favId ? "currentColor" : "none"} />
      {favId ? "已收藏" : "收藏"}
    </button>
  );
}
