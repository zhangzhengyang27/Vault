"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Upload,
  MessageSquare,
  Calendar,
  ChevronRight,
  Star,
  FileText,
  Heart,
  Users,
  Settings,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/lib/auth";

interface PublicUser {
  id: number;
  username: string;
  nickname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  createdAt: string;
  stats: {
    posts: number;
    submissions: number;
    comments: number;
    followers: number;
    following: number;
    likesReceived: number;
  };
}

interface UserPost {
  id: number;
  title: string;
  excerpt: string;
  likes: number;
  comments: number;
  createdAt: string;
}

interface UserSubmission {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  url?: string | null;
  status: string;
  contentId?: number | null;
  slug?: string | null;
  createdAt: string;
}

interface UserComment {
  id: number;
  content: string;
  rating?: number | null;
  targetType: string;
  targetId?: number | null;
  targetSlug?: string | null;
  createdAt: string;
}

interface FollowUser {
  id: number;
  username: string;
  nickname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  followedAt?: string;
}

type TabType = "posts" | "submissions" | "comments" | "following" | "followers";

/** 投稿类型 → 中文标签 */
const typeLabels: Record<string, string> = {
  tool: "AI 工具",
  prompt: "提示词",
  news: "资讯",
  mcp: "MCP 服务",
};

/** 评论目标类型 → 中文标签 */
const targetTypeLabels: Record<string, string> = {
  tool: "工具",
  prompt: "提示词",
  article: "文章",
  news: "资讯",
  post: "帖子",
  mcp: "MCP",
  skill: "Skill",
};

/** 投稿详情跳转（与旧版一致的路由映射） */
function submissionLink(s: UserSubmission): string | null {
  if (!s.contentId) return null;
  const prefix =
    s.type === "tool"
      ? "tools"
      : s.type === "prompt"
        ? "prompts"
        : s.type === "mcp"
          ? "mcp"
          : s.type === "post"
            ? "community"
            : "news";
  return `/${prefix}${s.slug ? `/${s.slug}` : ""}`;
}

/** 评论目标跳转：优先 slug 快照，post 按 id 寻址 */
function commentLink(c: UserComment): string | null {
  const prefixMap: Record<string, string> = {
    tool: "/tools",
    prompt: "/prompts",
    article: "/knowledge",
    news: "/news",
    post: "/community",
    mcp: "/mcp",
    skill: "/skills",
  };
  const prefix = prefixMap[c.targetType];
  if (!prefix) return null;
  // 帖子无 slug，按 id 寻址
  if (c.targetType === "post" && c.targetId) return `/community/${c.targetId}`;
  const slug = c.targetSlug;
  return slug ? `${prefix}/${slug}` : prefix;
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(s).toLocaleDateString("zh-CN");
}

function UserCard({
  u,
  initialFollowing,
}: {
  u: FollowUser;
  /** 批量预取的初始关注态（undefined 时 FollowButton 自查） */
  initialFollowing?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700">
      <Link href={`/users/${u.username}`} className="shrink-0">
        <Avatar name={u.nickname ?? u.username} src={u.avatar} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/users/${u.username}`}
          className="block truncate text-sm font-medium text-zinc-900 hover:text-[#1677ff] dark:text-zinc-100"
        >
          {u.nickname ?? u.username}
        </Link>
        {u.bio && (
          <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{u.bio}</p>
        )}
      </div>
      <FollowButton username={u.username} size="sm" initialFollowing={initialFollowing} />
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [followMapReady, setFollowMapReady] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [notFound, setNotFound] = useState(false);
  // 同路由参数导航（A 主页 → B 主页）组件不重挂载，关注/粉丝列表与 tab
  // 必须随 username 重置，否则串数据；渲染期调整，避免 effect 内同步 setState
  const [prevUsername, setPrevUsername] = useState(username);
  if (prevUsername !== username) {
    setPrevUsername(username);
    setFollowing([]);
    setFollowers([]);
    setActiveTab("posts");
    setLoading(true);
    setNotFound(false);
  }
  const isSelf = me?.username === username;

  const load = useCallback(async () => {
    if (!username) return;
    // 首屏 loading/notFound 由初始值与上方渲染期调整负责，此处仅异步回填
    try {
      const profileData = await fetch(
        `/api/users/${encodeURIComponent(username)}`,
      ).then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.ok ? res.json() : null;
      });
      setProfile(profileData);
      // 资料 404 时不再请求其余数据
      if (!profileData) return;
      const [postsData, submissionsData, commentsData] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(username)}/posts?limit=50`)
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .catch(() => ({ items: [] })),
        fetch(`/api/users/${encodeURIComponent(username)}/submissions?limit=50`)
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .catch(() => ({ items: [] })),
        fetch(`/api/users/${encodeURIComponent(username)}/comments?limit=50`)
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .catch(() => ({ items: [] })),
      ]);
      setPosts(postsData?.items ?? []);
      setSubmissions(submissionsData?.items ?? []);
      setComments(commentsData?.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  // 关注/粉丝列表懒加载：切到对应 tab 才请求
  const loadFollowList = useCallback(
    async (tab: "following" | "followers") => {
      const data = await fetch(
        `/api/users/${encodeURIComponent(username)}/${tab}?limit=50`,
      )
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .catch(() => ({ items: [] }));
      const list: FollowUser[] = data.items ?? [];
      if (tab === "following") setFollowing(list);
      else setFollowers(list);
      // 批量预取当前用户的关注态（一次请求替代每卡一查）
      if (list.length > 0) {
        const map = await fetch(
          `/api/users/is-following-batch?usernames=${list
            .map((u) => u.username)
            .join(",")}`,
        )
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({}));
        setFollowMap((prev) => ({ ...prev, ...(map ?? {}) }));
      }
      setFollowMapReady(true);
    },
    [username],
  );

  function switchTab(tab: TabType) {
    setActiveTab(tab);
    if (
      (tab === "following" && following.length === 0) ||
      (tab === "followers" && followers.length === 0)
    ) {
      void loadFollowList(tab as "following" | "followers");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-10" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <EmptyState
        icon={<User size={20} />}
        title="用户不存在"
        description="该用户可能已被删除或不存在。"
        actionLabel="返回首页"
        actionHref="/"
      />
    );
  }

  const displayName = profile.nickname ?? profile.username;
  const stats = profile.stats;

  const TABS: { key: TabType; label: string; count?: number }[] = [
    { key: "posts", label: "帖子", count: stats.posts },
    { key: "submissions", label: "提交", count: stats.submissions },
    { key: "comments", label: "评论", count: stats.comments },
    { key: "following", label: "关注", count: stats.following },
    { key: "followers", label: "粉丝", count: stats.followers },
  ];

  return (
    <div className="space-y-5">
      {/* 资料头卡 */}
      <section className="rounded-lg bg-white p-6 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar
            name={displayName}
            src={profile.avatar}
            size={64}
            rounded="rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {displayName}
              </h1>
              {profile.role === "admin" && (
                <span className="rounded bg-[#1677ff]/10 px-1.5 py-0.5 text-xs text-[#1677ff]">
                  管理员
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-400">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
                {profile.bio}
              </p>
            )}
            <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
              <Calendar size={12} /> {new Date(profile.createdAt).toLocaleDateString("zh-CN")}{" "}
              加入
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {isSelf ? (
              <Link
                href="/profile/settings"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-600 dark:text-zinc-300"
              >
                <Settings size={14} /> 编辑资料
              </Link>
            ) : (
              <>
                <Link
                  href={`/messages/im?username=${encodeURIComponent(profile.username)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-600 dark:text-zinc-300"
                >
                  <MessageSquare size={14} /> 私信
                </Link>
                <FollowButton username={profile.username} />
              </>
            )}
          </div>
        </div>

        {/* 统计行：关注/粉丝点击切 tab（对齐参考站交互） */}
        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
          {(
            [
              { label: "帖子", value: stats.posts, tab: "posts" as const },
              { label: "获赞", value: stats.likesReceived, tab: null },
              { label: "关注", value: stats.following, tab: "following" as const },
              { label: "粉丝", value: stats.followers, tab: "followers" as const },
              { label: "提交", value: stats.submissions, tab: "submissions" as const },
            ] as const
          ).map((s) =>
            s.tab ? (
              <button
                key={s.label}
                onClick={() => switchTab(s.tab as TabType)}
                className="transition hover:text-[#1677ff]"
              >
                <strong className="text-zinc-900 dark:text-zinc-100">{s.value}</strong>
                <span className="ml-1 text-zinc-400">{s.label}</span>
              </button>
            ) : (
              <span key={s.label}>
                <strong className="text-zinc-900 dark:text-zinc-100">{s.value}</strong>
                <span className="ml-1 text-zinc-400">{s.label}</span>
              </span>
            ),
          )}
        </div>
      </section>

      {/* Tab 栏 */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-white p-1 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm transition ${
              activeTab === t.key
                ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:text-[#5aa0ff]"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1 text-xs text-zinc-400">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 帖子 tab */}
      {activeTab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} />}
              title="还没有发布过帖子"
              actionLabel={isSelf ? "去发帖" : undefined}
              actionHref={isSelf ? "/community/new" : undefined}
            />
          ) : (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/community/${p.id}`}
                className="block rounded-lg bg-white p-4 transition hover:shadow-sm dark:bg-zinc-900"
              >
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{p.title}</h3>
                {p.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {p.excerpt}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                  <span>{timeAgo(p.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {p.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} /> {p.comments}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* 提交 tab */}
      {activeTab === "submissions" && (
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <EmptyState
              icon={<Upload size={20} />}
              title="暂无提交"
              description="该用户还没有提交过任何内容。"
            />
          ) : (
            submissions.map((s) => {
              const link = submissionLink(s);
              const inner = (
                <>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {typeLabels[s.type] ?? s.type}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {s.title}
                  </h3>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {s.description}
                    </p>
                  )}
                </>
              );
              return (
                <div
                  key={s.id}
                  className="rounded-lg bg-white p-4 transition hover:shadow-sm dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">{inner}</div>
                    {link && (
                      <Link
                        href={link}
                        className="inline-flex shrink-0 items-center gap-0.5 text-xs text-[#1677ff] hover:text-[#4096ff] dark:text-[#5aa0ff]"
                      >
                        查看 <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 评论 tab */}
      {activeTab === "comments" && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={20} />}
              title="暂无评论"
              description="该用户还没有发表过评论。"
            />
          ) : (
            comments.map((c) => {
              const link = commentLink(c);
              return (
                <div
                  key={c.id}
                  className="rounded-lg bg-white p-4 transition hover:shadow-sm dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          评论于{targetTypeLabels[c.targetType] ?? c.targetType}
                        </span>
                        {c.rating && c.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Star size={11} fill="currentColor" /> {c.rating}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {c.content}
                      </p>
                    </div>
                    {link && (
                      <Link
                        href={link}
                        className="inline-flex shrink-0 items-center gap-0.5 text-xs text-[#1677ff] hover:text-[#4096ff] dark:text-[#5aa0ff]"
                      >
                        查看 <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 关注 tab */}
      {activeTab === "following" && (
        <div className="space-y-2">
          {following.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="还没有关注任何人" />
          ) : (
            following.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                initialFollowing={
                  me ? (followMapReady ? (followMap[u.username] ?? false) : undefined) : false
                }
              />
            ))
          )}
        </div>
      )}

      {/* 粉丝 tab */}
      {activeTab === "followers" && (
        <div className="space-y-2">
          {followers.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="还没有粉丝" />
          ) : (
            followers.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                initialFollowing={
                  me ? (followMapReady ? (followMap[u.username] ?? false) : undefined) : false
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
