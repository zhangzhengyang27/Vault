"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Trash2,
  RefreshCcw,
  UserRound,
  Hash,
  Eye,
} from "lucide-react";
import Pagination from "@/components/Pagination";
import Skeleton from "@/components/Skeleton";
import Avatar from "@/components/Avatar";
import SuggestedUsers from "@/components/SuggestedUsers";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/relativeTime";
import { stripMarkdown } from "@/lib/markdown";

interface ApiPost {
  id: number;
  userId: number | null;
  authorName: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[] | null;
  createdAt: string;
}

interface ApiNews {
  slug: string;
  title: string;
}

type SortKey = "latest" | "hot";

const PAGE_SIZE = 20;

/** codefather /essay 同款强调色（Ant Design 蓝） */
const ACCENT = "text-[#1677ff] dark:text-[#5aa0ff]";

function PostCard({
  post,
  liked,
  canDelete,
  onDeleted,
}: {
  post: ApiPost;
  liked: boolean;
  canDelete: boolean;
  onDeleted: (id: number) => void;
}) {
  const router = useRouter();
  const [likes, setLikes] = useState(post.likes);
  // liked 状态由页面级回填补齐（登录用户刷新后仍保持点亮）；
  // props 变化时在渲染期同步 state（React 官方推荐模式，避免多余 effect）
  const [isLiked, setIsLiked] = useState(liked);
  const [prevLikedProp, setPrevLikedProp] = useState(liked);
  if (prevLikedProp !== liked) {
    setPrevLikedProp(liked);
    setIsLiked(liked);
  }
  const [busyLike, setBusyLike] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleLike() {
    if (busyLike) return;
    setBusyLike(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/login?redirect=/community/${post.id}`);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes ?? likes);
        setIsLiked(data.liked ?? !isLiked);
      }
    } catch {
      /* ignore */
    } finally {
      setBusyLike(false);
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/community/${post.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function deletePost() {
    if (!window.confirm("确定删除这条帖子吗？删除后不可恢复。")) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) onDeleted(post.id);
    } catch {
      /* ignore */
    }
  }

  const actionBtn =
    "flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <li
      id={`post-${post.id}`}
      className="rounded-lg bg-white px-5 py-4 dark:bg-zinc-900"
    >
      {/* 作者行 */}
      <div className="flex items-center gap-2.5">
        <Avatar name={post.authorName} />
        <span className="text-sm text-zinc-900 dark:text-zinc-100">
          {post.authorName}
        </span>
        {post.createdAt && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            · {relativeTime(post.createdAt)}
          </span>
        )}
        {canDelete && (
          <button
            onClick={deletePost}
            title="删除帖子"
            aria-label="删除帖子"
            className="ml-auto rounded-md p-1.5 text-zinc-300 transition hover:text-rose-500 dark:text-zinc-600"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* 标题 */}
      <h3 className="mt-2 text-lg font-semibold leading-snug">
        <Link
          href={`/community/${post.id}`}
          className="text-zinc-900 transition hover:text-[#1677ff] dark:text-zinc-50 dark:hover:text-[#5aa0ff]"
        >
          {post.title}
        </Link>
      </h3>

      {/* 摘要：两行截断 + 查看全文（与参考站一致）；正文为 Markdown，摘要去语法标记 */}
      {post.content && (
        <Link
          href={`/community/${post.id}`}
          className="mt-1.5 block"
          aria-label={`查看全文：${post.title}`}
        >
          <span className="line-clamp-2 whitespace-pre-wrap text-sm leading-[22px] text-zinc-500 dark:text-zinc-400">
            {stripMarkdown(post.content)}
          </span>
          <span className={`mt-0.5 inline-block text-sm ${ACCENT}`}>
            查看全文
          </span>
        </Link>
      )}

      {/* 话题标签 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/community?tag=${encodeURIComponent(t)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-[#5aa0ff]"
            >
              <Hash size={10} /> {t}
            </Link>
          ))}
        </div>
      )}

      {/* 操作行 */}
      <div className="mt-3.5 flex items-center gap-5 text-xs text-zinc-400 dark:text-zinc-500">
        <button
          onClick={toggleLike}
          disabled={busyLike}
          aria-label={isLiked ? "取消点赞" : "点赞"}
          className={`${actionBtn} hover:text-[#1677ff] dark:hover:text-[#5aa0ff] ${
            isLiked ? ACCENT : ""
          }`}
        >
          <ThumbsUp size={14} className={isLiked ? "fill-current" : ""} />
          {likes}
        </button>
        <button
          onClick={() => router.push(`/community/${post.id}#comments`)}
          aria-label="查看评论"
          className={`${actionBtn} hover:text-[#1677ff] dark:hover:text-[#5aa0ff]`}
        >
          <MessageCircle size={14} />
          {post.comments > 0 ? post.comments : "评论"}
        </button>
        {post.views > 0 && (
          <span className={`${actionBtn} cursor-default`}>
            <Eye size={14} /> {post.views}
          </span>
        )}
        <button
          onClick={share}
          aria-label="复制链接分享"
          className={`${actionBtn} hover:text-[#1677ff] dark:hover:text-[#5aa0ff]`}
        >
          <Share2 size={14} />
          {copied ? "已复制链接" : "分享"}
        </button>
      </div>
    </li>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityPageInner />
    </Suspense>
  );
}

function CommunityPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // 话题筛选：?tag=xxx（来自详情页/卡片的标签链接）
  const activeTag = searchParams.get("tag") ?? "";
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // 切换话题筛选后分页必须复位，否则停留在旧页码会拉到空结果；
  // activeTag 来自 URL，直接变化（浏览器前进/后退）时在渲染期复位
  const [prevTag, setPrevTag] = useState(activeTag);
  if (prevTag !== activeTag) {
    setPrevTag(activeTag);
    setPage(1);
  }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sort, setSort] = useState<SortKey>("latest");
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [hot, setHot] = useState<ApiPost[]>([]);
  const [news, setNews] = useState<ApiNews[]>([]);
  // 手动刷新信号：删除后触发重载
  const [tick, setTick] = useState(0);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/posts?page=${page}&limit=${PAGE_SIZE}&sort=${sort}${
          activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ""
        }`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const items: ApiPost[] = data.items ?? [];
      setPosts(items);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setLoadError(false);
      // 登录用户回填点赞状态（后端现成接口，此前从未被调用）
      if (user && items.length > 0) {
        try {
          const r = await fetch(
            `/api/posts/liked?ids=${items.map((i) => i.id).join(",")}`,
          );
          setLikedIds(r.ok ? new Set(await r.json()) : new Set());
        } catch {
          setLikedIds(new Set());
        }
      } else {
        setLikedIds(new Set());
      }
    } catch {
      setPosts([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, user, tick, activeTag]);

  useEffect(() => {
    // loadPosts 内的 setState 全部发生在 await 之后（异步回调），属规则文档允许的用法；
    // 分析器无法穿透被调函数的 await 边界，此处显式豁免
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    fetch("/api/posts?sort=hot&limit=5")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHot(d?.items ?? []))
      .catch(() => setHot([]));
    fetch("/api/news?page=1&limit=8")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNews(d?.items ?? []))
      .catch(() => setNews([]));
  }, []);

  function handleDeleted(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const nextTotal = Math.max(0, total - 1);
    setTotal(nextTotal);
    setTotalPages(Math.max(1, Math.ceil(nextTotal / PAGE_SIZE)));
  }

  const composerHref = user ? "/community/new" : "/login?redirect=%2Fcommunity%2Fnew";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* 左栏 · 发帖框 + 排序页签 + 帖子流（codefather /essay 布局） */}
      <div className="min-w-0">
        {/* 发帖框：两行布局（参考站同款） */}
        <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            {user ? (
              <Avatar name={user.username} size={36} />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                <UserRound size={18} />
              </span>
            )}
            <button
              onClick={() => router.push(composerHref)}
              className="h-8 shrink-0 rounded-md border border-zinc-300 px-4 text-sm text-zinc-700 transition hover:border-[#1677ff] hover:text-[#1677ff] dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-[#5aa0ff] dark:hover:text-[#5aa0ff]"
            >
              写帖子
            </button>
            <button
              onClick={() => router.push(composerHref)}
              className="flex-1 truncate text-left text-sm text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {user ? (
                "分享你的 AI 实践、问题或想法…"
              ) : (
                <>
                  点击 <span className={ACCENT}>登录</span>
                  ，快来和大家讨论吧～
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              友善发言、理性讨论，共建高质量 AI 社区
            </p>
            <button
              onClick={() => router.push(composerHref)}
              className="h-8 shrink-0 rounded-full bg-[#1677ff] px-5 text-sm text-white transition hover:bg-[#4096ff] dark:bg-[#1677ff] dark:hover:bg-[#4096ff]"
            >
              发布帖子
            </button>
          </div>
        </div>

        {/* 排序页签：激活项蓝色 + 底部下划线 */}
        <div className="mt-4 flex items-center gap-8 border-b border-zinc-200 dark:border-zinc-800">
          {(
            [
              ["latest", "最新"],
              ["hot", "热门"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setSort(v);
                setPage(1);
              }}
              className={`relative pb-2.5 text-base transition ${
                sort === v
                  ? `font-medium ${ACCENT}`
                  : "text-zinc-700 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
              }`}
            >
              {l}
              {sort === v && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1677ff] dark:bg-[#5aa0ff]" />
              )}
            </button>
          ))}
          <span className="ml-auto pb-2.5 text-xs text-zinc-400 dark:text-zinc-500">
            共 {total} 条讨论
          </span>
        </div>

        {/* 话题筛选条 */}
        {activeTag && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#1677ff]/5 px-4 py-2.5 text-sm dark:bg-[#1677ff]/10">
            <span className={`inline-flex items-center gap-1 ${ACCENT}`}>
              <Hash size={13} /> {activeTag}
            </span>
            <span className="text-xs text-zinc-400">话题下的讨论</span>
            <Link
              href="/community"
              className="ml-auto text-xs text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              清除筛选 ×
            </Link>
          </div>
        )}

        {/* 帖子流 */}
        {loading ? (
          <div className="mt-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-white px-5 py-4 dark:bg-zinc-900">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="mt-4 h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-3 rounded-lg bg-white px-4 py-16 text-center dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              帖子加载失败，请检查网络后重试。
            </p>
            <button
              onClick={() => setTick((t) => t + 1)}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff]/10 px-3 py-1.5 text-xs font-medium ${ACCENT} transition hover:bg-[#1677ff]/20`}
            >
              <RefreshCcw size={12} /> 重试
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-3 rounded-lg bg-white px-4 py-16 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            还没有帖子，来发布第一条吧。
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                liked={likedIds.has(p.id)}
                canDelete={
                  !!user && (user.role === "admin" || p.userId === user.id)
                }
                onDeleted={handleDeleted}
              />
            ))}
          </ul>
        )}

        <div className="mt-5">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      </div>

      {/* 右栏 · 榜单侧栏 */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          {/* 热门讨论 */}
          {hot.length > 0 && (
            <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                热门讨论
              </h3>
              <ul className="mt-3 space-y-2.5">
                {hot.map((h, i) => (
                  <li key={h.id}>
                    <Link
                      href={`/community/${h.id}`}
                      className="group flex items-baseline gap-2.5"
                    >
                      <span
                        className={`w-5 shrink-0 text-center text-sm font-semibold ${
                          i < 3
                            ? "text-orange-500"
                            : "text-zinc-300 dark:text-zinc-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="line-clamp-1 text-sm text-zinc-600 transition group-hover:text-[#1677ff] dark:text-zinc-300 dark:group-hover:text-[#5aa0ff]">
                        {h.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI 资讯榜 */}
          {news.length > 0 && (
            <div className="rounded-lg bg-white p-5 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  🌟 AI 资讯
                </h3>
                <Link
                  href="/news"
                  className="text-xs text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500 dark:hover:text-[#5aa0ff]"
                >
                  更多
                </Link>
              </div>
              <ul className="mt-3 space-y-2.5">
                {news.map((n, i) => (
                  <li key={n.slug}>
                    <Link
                      href={`/news/${n.slug}`}
                      className="group flex items-baseline gap-2.5"
                    >
                      <span
                        className={`w-5 shrink-0 text-center text-sm font-semibold ${
                          i < 3
                            ? "text-orange-500"
                            : "text-zinc-300 dark:text-zinc-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="line-clamp-1 text-sm text-zinc-600 transition group-hover:text-[#1677ff] dark:text-zinc-300 dark:group-hover:text-[#5aa0ff]">
                        {n.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 推荐关注 */}
          <SuggestedUsers />
        </div>
      </aside>
    </div>
  );
}
