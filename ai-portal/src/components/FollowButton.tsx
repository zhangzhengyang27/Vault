"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function FollowButton({
  username,
  size = "md",
  initialFollowing,
}: {
  username: string;
  size?: "sm" | "md";
  /** 列表场景由批量接口预取（undefined 时组件自行单查，兼容旧用法） */
  initialFollowing?: boolean;
}) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const [loading, setLoading] = useState(false);
  const isSelf = user?.username === username;

  // 批量预取结果晚到（挂载后才拿到 initialFollowing）时在渲染期同步，
  // 避免 effect 内同步 setState 触发级联渲染
  const [prevInitial, setPrevInitial] = useState(initialFollowing);
  if (prevInitial !== initialFollowing) {
    setPrevInitial(initialFollowing);
    setFollowing(initialFollowing ?? false);
  }

  useEffect(() => {
    // 批量预取：外部提供初始值时跳过单查
    if (initialFollowing !== undefined) return;
    if (!user || isSelf || !username) return;
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(username)}/is-following`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setFollowing(!!data.following);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, username, isSelf, initialFollowing]);

  // 未登录不展示（浏览者无关注能力）；本人主页也不展示
  if (!user || isSelf || !username) return null;

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const next = !following;
    setFollowing(next); // 乐观更新
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/follow`,
        {
          method: next ? "POST" : "DELETE",
          credentials: "include",
        },
      );
      // 非 2xx（401 会话过期 / 404 用户消失等）一律回滚，避免假状态
      if (!res.ok) setFollowing(!next);
    } catch {
      setFollowing(!next); // 失败回滚
    } finally {
      setLoading(false);
    }
  }

  const base =
    size === "sm"
      ? "px-2.5 py-1 text-xs rounded-md"
      : "px-4 py-1.5 text-sm rounded-lg";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`whitespace-nowrap font-medium transition disabled:opacity-60 ${
        following
          ? "border border-zinc-300 text-zinc-600 hover:border-rose-300 hover:text-rose-500 dark:border-zinc-600 dark:text-zinc-300"
          : "bg-[#1677ff] text-white hover:bg-[#4096ff]"
      } ${base}`}
    >
      {following ? "已关注" : "+ 关注"}
    </button>
  );
}
