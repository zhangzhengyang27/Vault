"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  ThumbsUp,
  Share2,
  Trash2,
  RefreshCcw,
  Heart,
  CornerDownRight,
  PencilLine,
  Hash,
} from "lucide-react";
import DOMPurify from "dompurify";
import "md-editor-rt/lib/preview.css";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";

// md-editor-rt 依赖浏览器环境，仅在客户端加载（Next SSR 下会访问 window）
const MdPreview = dynamic(
  () =>
    import("md-editor-rt").then((m) => {
      // breaks：单个换行渲染为 <br>，兼容历史纯文本帖子的换行习惯
      m.config({ markdownItConfig: (md) => md.set({ breaks: true }) });
      return m.MdPreview;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 h-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
    ),
  },
);

interface ApiPost {
  id: number;
  userId: number | null;
  authorName: string;
  author?: {
    id: number;
    username: string;
    nickname: string | null;
    avatar: string | null;
  } | null;
  title: string;
  content: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[] | null;
  createdAt: string;
}

interface ApiComment {
  id: number;
  userId: number | null;
  authorName: string;
  parentId: number | null;
  likes: number;
  content: string;
  createdAt?: string;
}

interface ApiNews {
  slug: string;
  title: string;
}

/** codefather /post 同款强调色（Ant Design 蓝） */
const ACCENT = "text-[#1677ff] dark:text-[#5aa0ff]";

/** 详情页日期格式与参考站一致：2026-09-14 15:01 */
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 就地展开的内联回复框：出现在被回复评论的正下方，自动聚焦 */
function ReplyInlineForm({
  authorName,
  value,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  authorName: string;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-2.5 flex items-start gap-2.5 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50"
    >
      <CornerDownRight size={13} className="mt-2.5 shrink-0 text-zinc-400" />
      <div className="min-w-0 flex-1">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={`回复 @${authorName}…`}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20"
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <span className="mr-auto text-xs text-zinc-300 dark:text-zinc-600">
            {value.length}/1000
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="h-7 rounded-full px-3 text-xs text-zinc-500 transition hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="h-7 rounded-full bg-[#1677ff] px-4 text-xs text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "发布中…" : "回复"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** 单条评论行（顶级/回复共用；compact 用于楼中楼里的小号布局） */
function CommentRow({  c,
  user,
  liked,
  busyLike,
  compact = false,
  onLike,
  onReply,
  onDelete,
}: {
  c: ApiComment;
  user: { id: number; username: string; nickname?: string | null; role: string } | null;
  liked: boolean;
  busyLike: boolean;
  compact?: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete?: () => void;
}) {
  const size = compact ? 28 : 36;
  return (
    <div className="flex items-start gap-3">
      <Avatar name={c.authorName} size={size} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`font-medium text-zinc-900 dark:text-zinc-100 ${
              compact ? "text-[13px]" : "text-sm"
            }`}
          >
            {c.authorName}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {c.createdAt ? fmtDate(c.createdAt) : ""}
          </span>
        </div>
        <p
          className={`mt-1 whitespace-pre-wrap leading-6 text-zinc-800 dark:text-zinc-200 ${
            compact ? "text-[13px]" : "text-sm"
          }`}
        >
          {c.content}
        </p>
        <div className="mt-1.5 flex items-center gap-4">
          {user && (
            <button
              onClick={onLike}
              disabled={busyLike}
              title={liked ? "取消点赞" : "点赞"}
              className={`inline-flex items-center gap-1 text-xs transition disabled:opacity-50 ${
                liked
                  ? "text-rose-500"
                  : "text-zinc-400 hover:text-rose-500 dark:text-zinc-500"
              }`}
            >
              <Heart size={13} fill={liked ? "currentColor" : "none"} />
              {c.likes > 0 && <span>{c.likes}</span>}
            </button>
          )}
          {user && (
            <button
              onClick={onReply}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-[#1677ff] dark:text-zinc-500"
            >
              <CornerDownRight size={13} /> 回复
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="删除"
              className="text-zinc-300 transition hover:text-rose-500 dark:text-zinc-600"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  // 非法 ID 直接按不存在处理（渲染期推导，不经 effect）
  const validId = Number.isInteger(postId) && postId > 0;
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [busyLike, setBusyLike] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [content, setContent] = useState("");
  const [busyComment, setBusyComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  // 内联回复：replyTo 为被点「回复」的那条评论，回复框就地展开在其下方
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [busyReply, setBusyReply] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [busyCommentLike, setBusyCommentLike] = useState<number | null>(null);
  // 点赞计数相对加载值的增量（乐观显示，刷新列表后归零）
  const [likeDelta, setLikeDelta] = useState<Record<number, number>>({});
  const [commentSort, setCommentSort] = useState<"latest" | "hot">("latest");
  const [hot, setHot] = useState<ApiPost[]>([]);
  const [news, setNews] = useState<ApiNews[]>([]);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setNotFound(false);
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data: ApiPost = await res.json();
      setPost(data);
      setLikes(data.likes);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
    // 注意：依赖只有 postId。登录态回填拆到下方独立 effect——
    // 否则 /auth/me 解析完成后本请求重发，详情接口 views 自增导致阅读数双计
  }, [postId]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/posts/${postId}/comments?sort=${commentSort}`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const list: ApiComment[] = Array.isArray(data) ? data : [];
      setComments(list);
      // 已点赞评论回填（登录态）
      if (user && list.length > 0) {
        try {
          const r = await fetch(
            `/api/comments/liked?ids=${list.map((c) => c.id).join(",")}`,
          );
          if (r.ok) setLikedComments(new Set(await r.json()));
        } catch {
          /* 回填失败不阻塞渲染 */
        }
      } else {
        setLikedComments(new Set());
      }
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, user, commentSort]);

  useEffect(() => {
    if (!validId) return;
    // loadPost/loadComments 内的 setState 均发生在 await 之后（异步回调），
    // 属规则文档允许的用法；分析器无法穿透 await 边界，显式豁免
    /* eslint-disable react-hooks/set-state-in-effect */
    loadPost();
    loadComments();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadPost, loadComments, validId]);

  // 点赞状态回填：仅依赖登录态变化（与 loadPost 分离，避免 auth 解析后重发详情请求使 views 双计）
  useEffect(() => {
    if (!validId || !user) return;
    void (async () => {
      try {
        const r = await fetch(`/api/posts/liked?ids=${postId}`);
        if (r.ok) setIsLiked((await r.json()).includes(postId));
      } catch {
        /* 状态回填失败不阻塞渲染 */
      }
    })();
  }, [postId, user, validId]);

  // 未登录/无效 id 时无点赞态：渲染期派生，避免 effect 内同步清 state 引发级联渲染
  const liked = !!user && isLiked;

  // 侧栏榜单（与列表页一致）
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

  // 从列表点评论图标跳转过来时（#comments），滚动到评论区
  useEffect(() => {
    if (commentsLoading || comments.length === 0) return;
    if (window.location.hash !== "#comments") return;
    document
      .getElementById("comments")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [commentsLoading, comments.length]);

  async function toggleLike() {
    if (busyLike) return;
    setBusyLike(true);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/login?redirect=/community/${postId}`);
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
        `${window.location.origin}/community/${postId}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || busyComment) return;
    setBusyComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/community/${postId}`);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setContent("");
      loadComments();
    } catch {
      setCommentError("评论发送失败，请稍后重试");
    } finally {
      setBusyComment(false);
    }
  }

  /** 回复统一挂到顶级评论：点子评论的「回复」也归位到它的父评论 */
  function startReply(c: ApiComment) {
    setReplyTo(c);
    setReplyContent("");
  }

  function cancelReply() {
    setReplyTo(null);
    setReplyContent("");
  }

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!replyTo || !replyContent.trim() || busyReply) return;
    setBusyReply(true);
    setCommentError("");
    try {
      const rootId = replyTo.parentId ?? replyTo.id;
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, parentId: rootId }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/community/${postId}`);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      cancelReply();
      loadComments();
    } catch {
      setCommentError("回复发送失败，请稍后重试");
    } finally {
      setBusyReply(false);
    }
  }

  async function toggleCommentLike(c: ApiComment) {
    if (busyCommentLike) return;
    setBusyCommentLike(c.id);
    const next = new Set(likedComments);
    const wasLiked = next.has(c.id);
    if (wasLiked) next.delete(c.id);
    else next.add(c.id);
    setLikedComments(next); // 乐观更新
    setLikeDelta((prev) => ({
      ...prev,
      [c.id]: (prev[c.id] ?? 0) + (wasLiked ? -1 : 1),
    }));
    try {
      const res = await fetch(`/api/comments/${c.id}/like`, {
        method: "POST",
      });
      if (res.status === 401) {
        setLikedComments(likedComments); // 未登录回滚
        setLikeDelta((prev) => ({
          ...prev,
          [c.id]: (prev[c.id] ?? 0) + (wasLiked ? 1 : -1),
        }));
        router.push(`/login?redirect=/community/${postId}`);
        return;
      }
      if (!res.ok) {
        setLikedComments(likedComments); // 失败回滚
        setLikeDelta((prev) => ({
          ...prev,
          [c.id]: (prev[c.id] ?? 0) + (wasLiked ? 1 : -1),
        }));
      }
    } catch {
      setLikedComments(likedComments);
      setLikeDelta((prev) => ({
        ...prev,
        [c.id]: (prev[c.id] ?? 0) + (wasLiked ? 1 : -1),
      }));
    } finally {
      setBusyCommentLike(null);
    }
  }

  async function deleteComment(c: ApiComment) {
    if (!window.confirm("确定删除这条评论吗？其下回复将一并删除。")) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${c.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setCommentError("删除失败，请重试");
        return;
      }
      loadComments();
    } catch {
      setCommentError("删除失败，请稍后重试");
    }
  }

  async function deletePost() {
    if (!window.confirm("确定删除这条帖子吗？删除后不可恢复。")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push(`/login?redirect=/community/${postId}`);
        return;
      }
      if (res.ok) router.push("/community");
    } catch {
      /* ignore */
    }
  }

  function scrollToComments() {
    document
      .getElementById("comments")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (notFound || !validId || (!post && !loadError)) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg bg-white px-4 py-16 text-center dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          帖子不存在或已被删除。
        </p>
        <Link
          href="/community"
          className={`mt-4 inline-block text-sm font-medium ${ACCENT} hover:underline`}
        >
          返回社区
        </Link>
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg bg-white px-4 py-16 text-center dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          帖子加载失败，请检查网络后重试。
        </p>
        <button
          onClick={() => loadPost()}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1677ff]/10 px-3 py-1.5 text-xs font-medium ${ACCENT} transition hover:bg-[#1677ff]/20`}
        >
          <RefreshCcw size={12} /> 重试
        </button>
      </div>
    );
  }

  const canDelete =
    !!user && (user.role === "admin" || post.userId === user.id);
  const canEdit = canDelete;

  // 悬浮操作条按钮（参考站 post-suspended-panel：图标+数字纵向排列）
  const floatBtn =
    "flex w-full flex-col items-center gap-1 text-zinc-400 transition hover:text-[#1677ff] disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-500 dark:hover:text-[#5aa0ff]";

  return (
    <div>
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
      >
        <ArrowLeft size={13} /> 返回社区
      </Link>

      <div className="mt-3 flex items-start gap-4">
        {/* 悬浮操作条（参考站 sticky 面板，宽屏显示） */}
        <div className="sticky top-28 hidden w-[60px] shrink-0 flex-col items-center gap-5 self-start py-1 xl:flex">
          <button
            onClick={toggleLike}
            disabled={busyLike}
            aria-label={liked ? "取消点赞" : "点赞"}
            className={`${floatBtn} ${liked ? ACCENT : ""}`}
          >
            <ThumbsUp size={20} className={liked ? "fill-current" : ""} />
            <span className="text-xs">{likes}</span>
          </button>
          <button
            onClick={scrollToComments}
            aria-label="查看评论"
            className={floatBtn}
          >
            <MessageCircle size={20} />
            <span className="text-xs">{post.comments}</span>
          </button>
          <button onClick={share} aria-label="复制链接分享" className={floatBtn}>
            <Share2 size={20} />
            <span className="text-xs">{copied ? "已复制" : "分享"}</span>
          </button>
          {canDelete && (
            <button
              onClick={deletePost}
              aria-label="删除帖子"
              className="flex w-full flex-col items-center gap-1 text-zinc-400 transition hover:text-rose-500 dark:text-zinc-500"
            >
              <Trash2 size={20} />
              <span className="text-xs">删除</span>
            </button>
          )}
        </div>

        {/* 主列：正文卡 + 评论区 */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 正文卡（参考站规格：24px 内距，28px 标题，16px/28px 正文） */}
          <article className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
            <h1 className="text-[22px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-[28px] sm:leading-9">
              {post.title}
            </h1>

            {/* 作者行：头像 · 名字(链主页) | 关注 | 发布时间 */}
            <div className="mt-3.5 flex items-center gap-2.5">
              <Avatar
                name={post.author?.nickname ?? post.authorName}
                src={post.author?.avatar}
                size={32}
              />
              {post.author ? (
                <Link
                  href={`/users/${post.author.username}`}
                  className="text-sm text-zinc-900 transition hover:text-[#1677ff] dark:text-zinc-100"
                >
                  {post.author.nickname ?? post.authorName}
                </Link>
              ) : (
                <span className="text-sm text-zinc-900 dark:text-zinc-100">
                  {post.authorName}
                </span>
              )}
              {post.author && (
                <FollowButton username={post.author.username} size="sm" />
              )}
              <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                {fmtDate(post.createdAt)}
              </span>
              <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                阅读 {post.views}
              </span>
              {canEdit && (
                <Link
                  href={`/community/${postId}/edit`}
                  className="rounded-md p-1.5 text-zinc-300 transition hover:text-[#1677ff] dark:text-zinc-600"
                  title="编辑帖子"
                  aria-label="编辑帖子"
                >
                  <PencilLine size={14} />
                </Link>
              )}
              {canDelete && (
                <button
                  onClick={deletePost}
                  title="删除帖子"
                  aria-label="删除帖子"
                  className="ml-auto rounded-md p-1.5 text-zinc-300 transition hover:text-rose-500 dark:text-zinc-600"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {post.content && (
              <div className="mt-6">
                {/* Markdown 渲染（帖子正文为 md-editor-rt 编辑的 md 源码）。
                    md-editor-rt 的 markdown-it 默认 html:true（内联 HTML 原样放行），
                    帖子是未审核的用户内容，必须经 DOMPurify 清洗后再渲染 */}
                <MdPreview
                  id="post-content-preview"
                  modelValue={post.content}
                  theme={theme === "dark" ? "dark" : "light"}
                  previewTheme="github"
                  codeTheme="github"
                  sanitize={(html) => DOMPurify.sanitize(html)}
                />
              </div>
            )}

            {/* 话题标签 */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/community?tag=${encodeURIComponent(t)}`}
                    className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 transition hover:bg-[#1677ff]/10 hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
                  >
                    <Hash size={11} /> {t}
                  </Link>
                ))}
              </div>
            )}

            {/* 文末操作行：点赞 | 评论 | 分享（参考站用分隔线隔开） */}
            <div className="mt-8 flex items-center gap-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <button
                onClick={toggleLike}
                disabled={busyLike}
                aria-label={liked ? "取消点赞" : "点赞"}
                className={`flex items-center gap-1.5 text-sm transition disabled:opacity-50 ${
                  liked
                    ? ACCENT
                    : "text-zinc-500 hover:text-[#1677ff] dark:text-zinc-400 dark:hover:text-[#5aa0ff]"
                }`}
              >
                <ThumbsUp size={16} className={liked ? "fill-current" : ""} />
                {likes > 0 ? likes : "点赞"}
              </button>
              <span className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />
              <button
                onClick={scrollToComments}
                aria-label="查看评论"
                className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-[#1677ff] dark:text-zinc-400 dark:hover:text-[#5aa0ff]"
              >
                <MessageCircle size={16} />
                {post.comments > 0 ? post.comments : "评论"}
              </button>
              <span className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />
              <button
                onClick={share}
                aria-label="复制链接分享"
                className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-[#1677ff] dark:text-zinc-400 dark:hover:text-[#5aa0ff]"
              >
                <Share2 size={16} />
                {copied ? "已复制链接" : "分享"}
              </button>
            </div>
          </article>

          {/* 评论区（参考站："N个评论" 标题 + 头像输入框 + 楼层列表） */}
          <section
            id="comments"
            className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {comments.length} 个评论
              </h2>
              {/* 排序切换（评论数 > 1 才有意义） */}
              {comments.length > 1 && (
                <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800">
                  {(
                    [
                      ["latest", "最新"],
                      ["hot", "最热"],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setCommentSort(v)}
                      className={`rounded-full px-2.5 py-1 transition ${
                        commentSort === v
                          ? "bg-white font-medium text-[#1677ff] shadow-sm dark:bg-zinc-700 dark:text-[#5aa0ff]"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 顶级评论框（回复走评论下方就地展开的内联框） */}
            <form
              id="comment-input"
              onSubmit={submitComment}
              className="mt-4 flex items-start gap-3"
            >
              {user ? (
                <Avatar name={user.nickname ?? user.username} size={36} />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                  ？
                </span>
              )}
              <div className="min-w-0 flex-1">
                {user ? (
                  <>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="写下你的评论…"
                      className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20"
                    />
                    <div className="mt-2 flex items-center justify-end gap-3">
                      <span className="text-xs text-zinc-300 dark:text-zinc-600">
                        {content.length}/1000
                      </span>
                      <button
                        type="submit"
                        disabled={busyComment || !content.trim()}
                        className="h-8 rounded-full bg-[#1677ff] px-5 text-sm text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyComment ? "发布中…" : "发布"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/login?redirect=/community/${postId}`)
                    }
                    className="w-full rounded-lg bg-zinc-50 px-4 py-3.5 text-left text-sm text-zinc-400 transition hover:bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:bg-zinc-800"
                  >
                    点击 <span className={ACCENT}>登录</span>
                    ，快来和大家讨论吧～
                  </button>
                )}
                {commentError && (
                  <p className="mt-2 text-xs text-red-500">{commentError}</p>
                )}
              </div>
            </form>

            {/* 评论列表（一级楼中楼：顶级评论 + 其下回复） */}
            {commentsLoading ? (
              <p className="mt-4 border-t border-zinc-100 pt-4 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                加载评论…
              </p>
            ) : comments.length === 0 ? (
              <p className="mt-4 border-t border-zinc-100 pt-4 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                还没有评论，来说点什么吧。
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {comments
                  .filter((c) => !c.parentId)
                  .map((c) => {
                    const replies = comments.filter((r) => r.parentId === c.id);
                    const canDelete =
                      !!user && (c.userId === user.id || user.role === "admin");
                    return (
                      <li key={c.id} className="py-3.5">
                        <CommentRow
                          c={{ ...c, likes: c.likes + (likeDelta[c.id] ?? 0) }}
                          user={user}
                          liked={likedComments.has(c.id)}
                          busyLike={busyCommentLike === c.id}
                          onLike={() => toggleCommentLike(c)}
                          onReply={() => startReply(c)}
                          onDelete={canDelete ? () => deleteComment(c) : undefined}
                        />
                        {replyTo?.id === c.id && (
                          <div className="ml-11">
                            <ReplyInlineForm
                              authorName={replyTo.authorName}
                              value={replyContent}
                              busy={busyReply}
                              onChange={setReplyContent}
                              onSubmit={submitReply}
                              onCancel={cancelReply}
                            />
                          </div>
                        )}
                        {replies.length > 0 && (
                          <ul className="ml-11 mt-2 space-y-3 border-l border-zinc-100 pl-3 dark:border-zinc-800">
                            {replies.map((r) => {
                              const canDeleteReply =
                                !!user &&
                                (r.userId === user.id || user.role === "admin");
                              return (
                                <li key={r.id}>
                                  <CommentRow
                                    c={{
                                      ...r,
                                      likes: r.likes + (likeDelta[r.id] ?? 0),
                                    }}
                                    user={user}
                                    liked={likedComments.has(r.id)}
                                    busyLike={busyCommentLike === r.id}
                                    compact
                                    onLike={() => toggleCommentLike(r)}
                                    onReply={() => startReply(r)}
                                    onDelete={
                                      canDeleteReply
                                        ? () => deleteComment(r)
                                        : undefined
                                    }
                                  />
                                  {replyTo?.id === r.id && (
                                    <div className="ml-11">
                                      <ReplyInlineForm
                                        authorName={replyTo.authorName}
                                        value={replyContent}
                                        busy={busyReply}
                                        onChange={setReplyContent}
                                        onSubmit={submitReply}
                                        onCancel={cancelReply}
                                      />
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>

        {/* 右栏榜单（与列表页同款卡片） */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-28 space-y-4">
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
          </div>
        </aside>
      </div>
    </div>
  );
}
