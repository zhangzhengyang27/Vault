"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  MessageSquare,
  Heart,
  Shield,
  Info,
  UserPlus,
} from "lucide-react";
import { useNotifications, type Notification } from "@/lib/useNotifications";

const TYPE_ICON = {
  system: Info,
  comment: MessageSquare,
  like: Heart,
  audit: Shield,
  follow: UserPlus,
};

const TYPE_COLOR = {
  system: "text-[#1677ff] bg-[#1677ff]/10 dark:bg-blue-500/10",
  comment: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  like: "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
  audit: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
  follow: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
};

const TYPE_LABEL: Record<string, string> = {
  system: "系统",
  comment: "评论",
  like: "点赞",
  audit: "审核",
  follow: "关注",
};

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
  // 注：投稿审核类通知由后端携带内容类型/slug（tool/prompt/...），
  // 直接跳转已发布内容详情页，无需指向任何后台地址
  const prefix = typeMap[n.targetType];
  if (!prefix) return undefined;
  // 详情路由按 slug 寻址：有 slug 快照用 slug，否则退回列表页（避免拼 id 404）
  const slug = n.targetSlug;
  return slug ? `${prefix}/${slug}` : prefix;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  // 私信未读与通知未读合并显示（私信数据源独立）
  const [dmUnread, setDmUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 首次与每次展开时刷新私信未读
    void (async () => {
      try {
        const res = await fetch("/api/messages/unread", {
          credentials: "include",
        });
        if (res.ok) {
          const n = await res.json();
          setDmUnread(typeof n === "number" ? n : 0);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [open]);

  const unreadTotal = unreadCount + dmUnread;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="通知"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
      >
        <Bell size={17} />
        {unreadTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {dmUnread > 0 && (
            <Link
              href="/messages/im"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between bg-[#1677ff]/5 px-4 py-2.5 text-xs text-[#1677ff] transition hover:bg-[#1677ff]/10 dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]"
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare size={13} /> 你有 {dmUnread} 条未读私信
              </span>
              <span>去查看 →</span>
            </Link>
          )}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              通知
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {unreadCount} 条未读
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-[#1677ff]"
              >
                查看全部
              </Link>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-xs text-[#1677ff] hover:text-[#1677ff] dark:text-[#5aa0ff]"
                >
                  <Check size={12} /> 全部已读
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-zinc-400">
                暂无通知
              </div>
            ) : (
              notifications.map((n: Notification) => {
                const Icon = TYPE_ICON[n.type as keyof typeof TYPE_ICON] ?? Info;
                const link = getTargetLink(n);
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-zinc-50 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30 ${
                      !n.read ? "bg-[#1677ff]/5 dark:bg-[#1677ff]/5" : ""
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TYPE_COLOR[n.type as keyof typeof TYPE_COLOR] ?? TYPE_COLOR.system}`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {link ? (
                        <Link
                          href={link}
                          onClick={() => {
                            if (!n.read) markAsRead(n.id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {n.title}
                          </p>
                          {n.content && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {n.content}
                            </p>
                          )}
                        </Link>
                      ) : (
                        <>
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {n.title}
                          </p>
                          {n.content && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {n.content}
                            </p>
                          )}
                        </>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">
                          {TYPE_LABEL[n.type] ?? "通知"}
                        </span>
                        <span className="text-[11px] text-zinc-300">·</span>
                        <span className="text-[11px] text-zinc-400">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        title="标记已读"
                        className="shrink-0 text-zinc-300 transition hover:text-[#1677ff] dark:text-zinc-600"
                      >
                        <Check size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
