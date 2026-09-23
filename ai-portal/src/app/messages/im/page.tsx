"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Search, Send } from "lucide-react";
import Avatar from "@/components/Avatar";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/relativeTime";

interface PartnerUser {
  id: number;
  username: string;
  nickname?: string | null;
  avatar?: string | null;
}

interface Conversation {
  partner: PartnerUser;
  lastMessage: { content: string; mine: boolean; createdAt: string };
  unread: number;
}

interface ChatMessage {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
}

interface ChatData {
  partner: PartnerUser;
  items: ChatMessage[];
  total: number;
}

/** IM 双栏：左联系人（5s 轮询未读），右会话（拉取即已读 + 5s 轮询） */
function ImPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeUsername = searchParams.get("username") ?? "";
  const [contacts, setContacts] = useState<Conversation[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [chat, setChat] = useState<ChatData | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.items ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchChat = useCallback(
    async (username: string, off = 0) => {
      try {
        const res = await fetch(
          `/api/messages/chat?username=${encodeURIComponent(username)}&limit=50&offset=${off}`,
          { credentials: "include" },
        );
        if (!res.ok) return null;
        const data: ChatData = await res.json();
        setChat((prev) => {
          if (off > 0 && prev && prev.partner.username === username) {
            // 加载更早：按 id 去重后前插
            const seen = new Set(prev.items.map((m) => m.id));
            return { ...data, items: [...data.items.filter((m) => !seen.has(m.id)), ...prev.items] };
          }
          return data;
        });
        return data;
      } catch {
        return null;
      }
    },
    [],
  );

  // 会话/登录态变化时清空旧会话并复位分页：渲染期调整，避免 effect 内同步 setState 级联渲染
  const sessionKey = `${user ? "in" : "out"}:${activeUsername ?? ""}`;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey);
    setChat(null);
    setOffset(0);
  }

  // 切换会话：拉取当前会话消息（fetchChat 内 setState 均在 await 之后，
  // 分析器无法穿透被调函数的 await 边界，显式豁免）
  useEffect(() => {
    if (!user || !activeUsername) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchChat(activeUsername, 0);
  }, [user, activeUsername, fetchChat]);

  // 联系人列表（fetchContacts 内 setState 在 await 之后，同上显式豁免）
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchContacts();
  }, [user, fetchContacts]);

  // 5s 轮询：会话新消息 + 联系人未读（页面不可见时跳过）
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void fetchContacts();
      if (activeUsername) void fetchChat(activeUsername, 0);
    }, 5000);
    return () => clearInterval(timer);
  }, [user, activeUsername, fetchContacts, fetchChat]);

  // 新消息到达自动滚底
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.items.length, chat?.partner.username]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !activeUsername) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: activeUsername, content: text }),
      });
      if (res.ok) {
        setInput("");
        void fetchChat(activeUsername, 0);
        void fetchContacts();
      }
    } finally {
      setSending(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="py-24 text-center text-sm text-zinc-400">
        请先
        <Link href="/login" className="mx-1 text-[#1677ff] hover:underline">
          登录
        </Link>
        后使用私信。
      </div>
    );
  }

  const filtered = contacts.filter((c) =>
    (c.partner.nickname ?? c.partner.username)
      .toLowerCase()
      .includes(contactSearch.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          私信
        </h1>
        <Link
          href="/messages"
          className="text-xs text-zinc-400 transition hover:text-[#1677ff]"
        >
          ← 消息中心
        </Link>
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[420px] overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* 左栏：联系人 */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-100 dark:border-zinc-800">
          <div className="border-b border-zinc-100 p-2.5 dark:border-zinc-800">
            <div className="flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1.5 dark:bg-zinc-800">
              <Search size={13} className="text-zinc-400" />
              <input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="搜索联系人"
                className="w-full bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-zinc-400">
                暂无会话，去用户主页发一条私信吧
              </p>
            ) : (
              filtered.map((c) => {
                const name = c.partner.nickname ?? c.partner.username;
                const active = c.partner.username === activeUsername;
                return (
                  <button
                    key={c.partner.id}
                    onClick={() =>
                      router.replace(`/messages/im?username=${encodeURIComponent(c.partner.username)}`)
                    }
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-[#1677ff]/10"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Avatar name={name} src={c.partner.avatar} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {name}
                        </span>
                        {c.unread > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-400">
                        {c.lastMessage.mine ? "我：" : ""}
                        {c.lastMessage.content}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 右栏：会话 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!activeUsername ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-zinc-400">
              <MessageSquare size={28} className="text-zinc-300" />
              选择一个联系人，开始私信
            </div>
          ) : !chat ? (
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <>
              {/* 会话头 */}
              <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <Avatar
                  name={chat.partner.nickname ?? chat.partner.username}
                  src={chat.partner.avatar}
                  size={30}
                />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {chat.partner.nickname ?? chat.partner.username}
                </span>
                <Link
                  href={`/users/${chat.partner.username}`}
                  className="text-xs text-zinc-400 transition hover:text-[#1677ff]"
                >
                  主页
                </Link>
                {chat.total > chat.items.length && (
                  <button
                    onClick={() => {
                      setOffset((o) => o + 50);
                      void fetchChat(activeUsername, offset + 50);
                    }}
                    className="ml-auto text-xs text-[#1677ff] hover:underline"
                  >
                    加载更早的消息
                  </button>
                )}
              </div>

              {/* 消息流 */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {chat.items.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}
                    >
                      {!mine && (
                        <Avatar
                          name={chat.partner.nickname ?? chat.partner.username}
                          src={chat.partner.avatar}
                          size={26}
                        />
                      )}
                      <div
                        className={`max-w-[70%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                          mine
                            ? "rounded-br-sm bg-[#1677ff] text-white"
                            : "rounded-bl-sm bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="shrink-0 text-[10px] text-zinc-300 dark:text-zinc-600">
                        {relativeTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })}
                {chat.items.length === 0 && (
                  <p className="py-10 text-center text-xs text-zinc-400">
                    还没有消息，打个招呼吧
                  </p>
                )}
              </div>

              {/* 输入区 */}
              <div className="flex items-end gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={1000}
                  placeholder="输入消息，Enter 发送…"
                  className="max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#1677ff] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={() => void send()}
                  disabled={sending || !input.trim()}
                  className="inline-flex h-[38px] items-center gap-1 rounded-lg bg-[#1677ff] px-4 text-sm text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={13} /> {sending ? "发送中…" : "发送"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesImPage() {
  return (
    <Suspense fallback={null}>
      <ImPageInner />
    </Suspense>
  );
}
