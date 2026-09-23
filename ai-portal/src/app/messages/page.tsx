"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Heart,
  MessageSquare,
  Shield,
  UserPlus,
  Info,
} from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import type { Notification } from "@/lib/useNotifications";

/** tab → 通知类型过滤（空数组 = 全部；dm 为私信，数据源独立） */
const TABS: { key: string; label: string; types: string[] }[] = [
  { key: "all", label: "全部", types: [] },
  { key: "comment", label: "评论互动", types: ["comment"] },
  { key: "like", label: "赞和收藏", types: ["like"] },
  { key: "follow", label: "新增关注", types: ["follow"] },
  { key: "dm", label: "私信", types: [] },
  { key: "system", label: "系统通知", types: ["system", "subscription", "submission"] },
];

const TYPE_META: Record<
  string,
  { icon: typeof Info; cls: string; label: string }
> = {
  comment: {
    icon: MessageSquare,
    cls: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    label: "评论",
  },
  like: {
    icon: Heart,
    cls: "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
    label: "赞",
  },
  follow: {
    icon: UserPlus,
    cls: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    label: "关注",
  },
  submission: {
    icon: Shield,
    cls: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    label: "审核",
  },
  subscription: {
    icon: Bell,
    cls: "text-[#1677ff] bg-[#1677ff]/10 dark:bg-blue-500/10",
    label: "订阅",
  },
  system: {
    icon: Info,
    cls: "text-[#1677ff] bg-[#1677ff]/10 dark:bg-blue-500/10",
    label: "系统",
  },
};

const PAGE_SIZE = 20;

function getTargetLink(n: Notification): string | undefined {
  // 帖子按 id 寻址（无 slug）
  if (n.targetType === "post" && n.targetId) return `/community/${n.targetId}`;
  // 关注类通知：targetSlug 存发起者用户名
  if (n.targetType === "user" && n.targetSlug) return `/users/${n.targetSlug}`;
  if (!n.targetType || !n.targetId) return undefined;
  const typeMap: Record<string, string> = {
    tool: "/tools",
    prompt: "/prompts",
    article: "/knowledge",
    news: "/news",
    repo: "/github",
    mcp: "/mcp",
    skill: "/skills",
  };
  const prefix = typeMap[n.targetType];
  if (!prefix) return undefined;
  const slug = (n as Notification & { targetSlug?: string | null }).targetSlug;
  return slug ? `${prefix}/${slug}` : prefix;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  // 私信 tab 的会话列表（数据源与通知独立）
  const [dmConversations, setDmConversations] = useState<
    {
      partner: { id: number; username: string; nickname?: string | null; avatar?: string | null };
      lastMessage: { content: string; mine: boolean; createdAt: string };
      unread: number;
    }[]
  >([]);
  const [dmLoading, setDmLoading] = useState(true);

  const activeTypes = TABS.find((t) => t.key === activeTab)?.types ?? [];

  const fetchList = useCallback(
    async (offset = 0) => {
      if (activeTab === "dm") return; // 私信 tab 数据源不同
      // loading 初始即为 true（首屏骨架），此处只做 finally 复位；
      // 避免在 effect 同步路径上 setState 引发级联渲染
      try {
        const qs = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (activeTypes.length) qs.set("types", activeTypes.join(","));
        const res = await fetch(`/api/notifications?${qs}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTotal(data.total ?? 0);
          setItems((prev) =>
            offset === 0 ? data.items ?? [] : [...prev, ...(data.items ?? [])],
          );
        }
      } finally {
        setLoading(false);
      }
    },
    // activeTypes 是由 activeTab 派生的字面量数组，依赖 activeTab 即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab],
  );

  const fetchUnread = useCallback(async () => {
    const entries = await Promise.all(
      TABS.map(async (t) => {
        // 私信 tab 的未读来自 messages 接口（与通知独立）
        if (t.key === "dm") {
          const res = await fetch("/api/messages/unread", {
            credentials: "include",
          });
          return [t.key, res.ok ? await res.json() : 0] as const;
        }
        const qs = t.types.length ? `?types=${t.types.join(",")}` : "";
        const res = await fetch(`/api/notifications/unread-count${qs}`, {
          credentials: "include",
        });
        return [t.key, res.ok ? await res.json() : 0] as const;
      }),
    );
    setUnread(Object.fromEntries(entries));
  }, []);

  // 私信会话列表（进入私信 tab 时拉取）
  const fetchDm = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDmConversations(data.items ?? []);
      }
    } finally {
      setDmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchList(0);
  }, [user, fetchList]);

  useEffect(() => {
    if (!user) return;
    // fetchUnread 内 setState 均在 await 之后（分析器无法穿透 await 边界，显式豁免）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUnread();
  }, [user, fetchUnread]);

  useEffect(() => {
    if (!user || activeTab !== "dm") return;
    void fetchDm();
  }, [user, activeTab, fetchDm]);

  async function markRead(id: number) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }).catch(() => {});
    void fetchUnread();
  }

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
    }).catch(() => {});
    void fetchUnread();
  }

  if (!authLoading && !user) {
    return (
      <EmptyState
        icon={<Bell size={20} />}
        title="请先登录"
        description="登录后查看你的消息中心。"
        actionLabel="去登录"
        actionHref="/login"
      />
    );
  }

  const hasUnread = Object.values(unread).some((v) => v > 0);

  return (
    <div className="space-y-5">
      <SectionHeader title="消息中心" description="评论、点赞与关注的实时动态" />

      {/* Tab 栏 + 全部已读 */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-white p-1 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative whitespace-nowrap rounded-md px-4 py-2 text-sm transition ${
              activeTab === t.key
                ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:text-[#5aa0ff]"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
            }`}
          >
            {t.label}
            {(unread[t.key] ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread[t.key] > 9 ? "9+" : unread[t.key]}
              </span>
            )}
          </button>
        ))}
        {hasUnread && activeTab !== "dm" && (
          <button
            onClick={markAll}
            className="ml-auto inline-flex items-center gap-1 whitespace-nowrap px-3 text-xs text-[#1677ff] dark:text-[#5aa0ff]"
          >
            <Check size={12} /> 全部已读
          </button>
        )}
      </div>

      {/* 通知列表 */}
      {/* 私信 tab：会话摘要列表（数据源独立于通知） */}
      {activeTab === "dm" ? (
        <div className="space-y-2">
          {dmLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : dmConversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={20} />}
              title="暂无私信"
              description="去用户主页或推荐关注里找人聊聊吧"
            />
          ) : (
            dmConversations.map((c) => {
              const name = c.partner.nickname ?? c.partner.username;
              return (
                <Link
                  key={c.partner.id}
                  href={`/messages/im?username=${encodeURIComponent(c.partner.username)}`}
                  className="flex items-center gap-3 rounded-lg bg-white p-4 transition hover:shadow-sm dark:bg-zinc-900"
                >
                  <Avatar name={name} src={c.partner.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {name}
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {c.lastMessage.mine ? "我：" : ""}
                      {c.lastMessage.content}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-zinc-300 dark:text-zinc-600">
                    {timeAgo(c.lastMessage.createdAt)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      ) : (
      <>
      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={20} />}
          title="暂无消息"
          description="有新互动时会在这里通知你"
        />
      ) : (
        <div className="divide-y divide-zinc-50 rounded-lg bg-white dark:divide-zinc-800/50 dark:bg-zinc-900">
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            const Icon = meta.icon;
            const link = getTargetLink(n);
            const body = (
              <>
                <p
                  className={`truncate text-sm font-medium ${
                    n.read
                      ? "text-zinc-700 dark:text-zinc-200"
                      : "text-zinc-900 dark:text-zinc-50"
                  }`}
                >
                  {n.title}
                </p>
                {n.content && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {n.content}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                  <span>{meta.label}</span>
                  <span>·</span>
                  <span>{timeAgo(n.createdAt)}</span>
                </div>
              </>
            );
            return (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                  !n.read ? "bg-[#1677ff]/5 dark:bg-[#1677ff]/5" : ""
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  {link ? (
                    <Link
                      href={link}
                      onClick={() => !n.read && markRead(n.id)}
                      className="block"
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="标记已读"
                    className="shrink-0 self-center text-zinc-300 transition hover:text-[#1677ff] dark:text-zinc-600"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 加载更多 */}
      {!loading && activeTab !== "dm" && items.length < total && (
        <div className="text-center">
          <button
            onClick={() => void fetchList(items.length)}
            className="rounded-lg border border-zinc-200 px-5 py-2 text-sm text-zinc-600 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-700 dark:text-zinc-300"
          >
            加载更多（已显示 {items.length}/{total}）
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
