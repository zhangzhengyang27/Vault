"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Heart, ChevronRight, Clock, X, Upload, CheckCircle, XCircle, Clock3, Bell, Tag, Hash, Search, FileText } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/useHistory";
import { useSubscriptions } from "@/lib/useSubscriptions";
import Skeleton from "@/components/Skeleton";

/** 浏览历史类型 → 中文标签（HistoryTracker 写入的 type 为英文标识） */
const HISTORY_TYPE_LABELS: Record<string, string> = {
  tool: "工具",
  prompt: "提示词",
  mcp: "MCP",
  skill: "Skill",
  news: "资讯",
  article: "文章",
  spotlight: "场景专题",
  post: "帖子",
  repo: "开源项目",
};

interface Favorite {
  id: number;
  targetType: string;
  targetId: number;
  title?: string | null;
  createdAt: string;
}

interface Submission {
  id: number;
  type: string;
  name?: string;
  title?: string;
  url?: string;
  description?: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { history, removeHistory, clearHistory } = useHistory();
  // 学习资源板块已下线：过滤掉本地历史里的存量 resource 记录，避免指向 404
  const visibleHistory = history.filter((h) => h.type !== "resource");
  const { subscriptions, unsubscribe } = useSubscriptions();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "posts" | "favorites" | "submissions" | "history" | "subscriptions"
  >("posts");
  const [myPosts, setMyPosts] = useState<
    { id: number; title: string; likes: number; comments: number; createdAt: string }[]
  >([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) {
        setLoadingFav(false);
        return;
      }
      try {
        const res = await fetch("/api/favorites", {
        });
        const data = res.ok ? await res.json() : [];
        setFavorites(Array.isArray(data) ? data : []);
      } finally {
        setLoadingFav(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    void (async () => {
      if (!user) {
        setLoadingSub(false);
        return;
      }
      try {
        const res = await fetch("/api/submissions/my", {
        });
        const data = res.ok ? await res.json() : [];
        setSubmissions(Array.isArray(data) ? data : []);
      } catch {
        setSubmissions([]);
      } finally {
        setLoadingSub(false);
      }
    })();
  }, [user]);

  async function removeFavorite(id: number) {
    if (!user) return;
    await fetch(`/api/favorites/${id}`, {
      method: "DELETE",
    });
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  useEffect(() => {
    void (async () => {
      if (!user) {
        setLoadingPosts(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(user.username)}/posts?limit=50`,
        );
        const data = res.ok ? await res.json() : { items: [] };
        setMyPosts(data.items ?? []);
      } catch {
        setMyPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    })();
  }, [user]);

  if (!loading && !user) {
    return (
      <div className="space-y-5">
        <SectionHeader title="个人中心" />
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-zinc-500 dark:text-zinc-400">
            请先登录后查看个人中心。
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff]"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="个人中心" />

      {/* 资料头卡 */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar
            name={user?.nickname ?? user?.username ?? "?"}
            src={user?.avatar}
            size={64}
            rounded="rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {user?.nickname ?? user?.username}
            </h2>
            <p className="text-sm text-zinc-400">@{user?.username}</p>
            {user?.bio && (
              <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
                {user.bio}
              </p>
            )}
            {!user?.bio && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {user?.email ?? "未填写邮箱"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/messages"
              className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-600 dark:text-zinc-300"
            >
              消息中心
            </Link>
            <Link
              href="/profile/settings"
              className="rounded-lg bg-[#1677ff] px-4 py-1.5 text-sm text-white transition hover:bg-[#4096ff]"
            >
              编辑资料
            </Link>
          </div>
        </div>
      </section>

      {/* Tab 栏 */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {(
          [
            { key: "posts", label: "我的帖子" },
            { key: "favorites", label: "我的收藏" },
            { key: "submissions", label: "我的提交" },
            { key: "history", label: "浏览历史" },
            { key: "subscriptions", label: "我的订阅" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm transition ${
              activeTab === t.key
                ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:text-[#5aa0ff]"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 我的帖子 */}
      {activeTab === "posts" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <FileText size={16} className="text-[#1677ff]" /> 我的帖子
              {!loadingPosts && myPosts.length > 0 && (
                <span className="text-xs font-normal text-zinc-400">({myPosts.length})</span>
              )}
            </h3>
            <Link
              href="/community/new"
              className="inline-flex items-center gap-0.5 text-xs text-[#1677ff] hover:text-[#4096ff] dark:text-[#5aa0ff]"
            >
              去发帖 <ChevronRight size={12} />
            </Link>
          </div>
          {loadingPosts ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : myPosts.length === 0 ? (
            <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
              还没有发过帖子，去社区分享你的第一个帖子吧。
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {myPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/community/${p.id}`}
                  className="block rounded-lg border border-zinc-100 p-3 transition hover:border-[#1677ff]/40 dark:border-zinc-800"
                >
                  <p className="truncate text-sm font-medium text-zinc-700 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:text-[#5aa0ff]">
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString("zh-CN")} · {p.likes} 赞 ·{" "}
                    {p.comments} 评论
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 我的收藏 */}
      {activeTab === "favorites" && (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <Heart size={16} className="text-rose-500" /> 我的收藏
            {!loadingFav && favorites.length > 0 && (
              <span className="text-xs font-normal text-zinc-400">({favorites.length})</span>
            )}
          </h3>
          {favorites.length > 0 && (
            <Link
              href="/profile/favorites"
              className="inline-flex items-center gap-0.5 text-xs text-[#1677ff] hover:text-[#4096ff] dark:text-[#5aa0ff]"
            >
              查看全部 <ChevronRight size={12} />
            </Link>
          )}
        </div>
        {loadingFav ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
            暂无收藏，去工具和提示词页面逛逛吧。
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {favorites.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {f.title || `${f.targetType} #${f.targetId}`}
                  </p>
                  <p className="text-xs text-zinc-400">{f.targetType}</p>
                </div>
                <button
                  onClick={() => removeFavorite(f.id)}
                  className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400"
                >
                  <Trash2 size={14} /> 移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* 浏览历史 */}
      {activeTab === "history" && (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <Clock size={16} className="text-[#1677ff]" /> 浏览历史
            {visibleHistory.length > 0 && (
              <span className="text-xs font-normal text-zinc-400">({visibleHistory.length})</span>
            )}
          </h3>
          {visibleHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-0.5 text-xs text-zinc-400 transition hover:text-rose-500"
            >
              <X size={12} /> 清除全部
            </button>
          )}
        </div>
        {visibleHistory.length === 0 ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
            暂无浏览记录，去逛逛吧。
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {visibleHistory.slice(0, 10).map((h) => (
              <div
                key={h.path}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <Link href={h.path} className="min-w-0 flex-1 group">
                  <p className="truncate text-sm font-medium text-zinc-700 group-hover:text-[#1677ff] dark:text-zinc-300 dark:group-hover:text-[#5aa0ff]">
                    {h.title}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {HISTORY_TYPE_LABELS[h.type] ?? h.type} · {new Date(h.timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </Link>
                <button
                  onClick={() => removeHistory(h.path)}
                  className="ml-2 flex items-center gap-1 text-xs text-zinc-400 transition hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* 我的提交 */}
      {activeTab === "submissions" && (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <Upload size={16} className="text-emerald-500" /> 我的提交
            {!loadingSub && submissions.length > 0 && (
              <span className="text-xs font-normal text-zinc-400">({submissions.length})</span>
            )}
          </h3>
          <Link
            href="/submit"
            className="inline-flex items-center gap-0.5 text-xs text-[#1677ff] hover:text-[#4096ff] dark:text-[#5aa0ff]"
          >
            新建提交 <ChevronRight size={12} />
          </Link>
        </div>
        {loadingSub ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
            暂无提交，去提交你发现的优质 AI 工具吧。
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {submissions.map((s) => {
              const statusConfig = {
                pending: { icon: Clock3, label: "审核中", color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
                approved: { icon: CheckCircle, label: "已通过", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
                rejected: { icon: XCircle, label: "已拒绝", color: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" },
              };
              const status = statusConfig[s.status] ?? statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {s.name || s.title || `${s.type} #${s.id}`}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {s.type} · {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                    {s.status === "rejected" && s.rejectReason && (
                      <p className="mt-1 text-xs text-rose-500">拒绝原因：{s.rejectReason}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    <StatusIcon size={11} /> {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* 我的订阅 */}
      {activeTab === "subscriptions" && (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <Bell size={16} className="text-[#1677ff]" /> 我的订阅
            {subscriptions.length > 0 && (
              <span className="text-xs font-normal text-zinc-400">({subscriptions.length})</span>
            )}
          </h3>
        </div>
        {subscriptions.length === 0 ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
            暂无订阅，去工具列表页订阅分类更新吧。
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {subscriptions.map((s) => {
              const typeIcon = { category: Tag, tag: Hash, keyword: Search };
              const Icon = typeIcon[s.targetType] ?? Tag;
              return (
                <div
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Icon size={11} />
                  {s.targetValue}
                  <button
                    onClick={() => unsubscribe(s.id)}
                    className="ml-1 text-zinc-400 transition hover:text-rose-500"
                    title="取消订阅"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}