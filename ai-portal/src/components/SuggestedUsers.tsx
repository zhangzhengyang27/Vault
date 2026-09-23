"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { useAuth } from "@/lib/auth";

interface SuggestedUser {
  id: number;
  username: string;
  nickname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  followers: number;
}

/** 推荐关注：按粉丝数排序（后端排除自己与已关注者），社区右栏/主页侧栏复用 */
export default function SuggestedUsers({ limit = 5 }: { limit?: number }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  // 批量关注状态：登录后一次拉取，替代每卡一次的 N+1 单查
  const [followMap, setFollowMap] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/users/suggested?limit=${limit}`, {
          credentials: "include",
        });
        if (res.ok) setUsers(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  useEffect(() => {
    if (!user || users.length === 0) return;
    fetch(
      `/api/users/is-following-batch?usernames=${users.map((u) => u.username).join(",")}`,
      { credentials: "include" },
    )
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setFollowMap(d ?? {}))
      .catch(() => setFollowMap({}));
  }, [user, users]);

  if (loading || users.length === 0) return null;

  return (
    <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <UserPlus size={15} className="text-[#1677ff]" /> 推荐关注
        </h3>
      </div>
      <ul className="mt-3 space-y-3">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-2.5">
            <Link href={`/users/${u.username}`} className="shrink-0">
              <Avatar name={u.nickname ?? u.username} src={u.avatar} size={34} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/users/${u.username}`}
                className="block truncate text-sm font-medium text-zinc-900 transition hover:text-[#1677ff] dark:text-zinc-100 dark:hover:text-[#5aa0ff]"
              >
                {u.nickname ?? u.username}
              </Link>
              <p className="truncate text-xs text-zinc-400">
                {u.bio || `${u.followers} 粉丝`}
              </p>
            </div>
            {/* 批量状态就绪前不出按钮，避免回落到 N+1 单查 */}
            {!user || followMap ? (
              <FollowButton
                username={u.username}
                size="sm"
                initialFollowing={followMap?.[u.username]}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
