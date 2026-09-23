"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Send, Trash2, MessageSquare, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

interface Comment {
  id: number;
  content: string;
  authorName: string;
  rating?: number | null;
  likes: number;
  userId: number | null;
  createdAt: string;
}

export default function CommentSection({
  targetType,
  targetId,
}: {
  targetType: string;
  targetId: number | string;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  // 点赞计数相对加载值的增量（乐观显示）
  const [likeDelta, setLikeDelta] = useState<Record<number, number>>({});

  const rollback = (commentId: number, wasLiked: boolean) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
    setLikeDelta((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] ?? 0) + (wasLiked ? -1 : 1),
    }));
  };

  const toggleLike = async (commentId: number) => {
    const wasLiked = likedComments.has(commentId);
    // 乐观更新，失败/未登录回滚
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    setLikeDelta((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] ?? 0) + (wasLiked ? -1 : 1),
    }));
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });
      if (res.status === 401) {
        rollback(commentId, wasLiked);
        window.alert("登录后才能点赞");
        return;
      }
      if (!res.ok) rollback(commentId, wasLiked);
    } catch {
      rollback(commentId, wasLiked);
    }
  };

  // useCallback 稳定引用，使其能安全进入下方 effect 的依赖数组
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/comments?targetType=${targetType}&targetId=${targetId}`,
      );
      if (res.ok) {
        const data = await res.json();
        const list: Comment[] = Array.isArray(data) ? data : [];
        setComments(list);
        // 登录态回填后端点赞状态（替换原 localStorage 方案）
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
      }
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, user]);

  useEffect(() => {
    void (async () => {
      await fetchComments();
    })();
  }, [fetchComments]);

  const avgRating = comments.filter((c) => c.rating).length
    ? comments.reduce((s, c) => s + (c.rating ?? 0), 0) /
      comments.filter((c) => c.rating).length
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/comments?targetType=${targetType}&targetId=${targetId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: text,
            rating: rating > 0 ? rating : undefined,
          }),
        },
      );
      if (res.ok) {
        setContent("");
        setRating(0);
        fetchComments();
      } else {
        window.alert("评论发布失败，请稍后重试。");
      }
    } catch {
      window.alert("评论发布失败，网络异常。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    if (!window.confirm("确定删除这条评论吗？")) return;
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        window.alert("删除失败，请重试。");
        return;
      }
      fetchComments();
    } catch {
      window.alert("删除失败，网络异常。");
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          <MessageSquare size={18} className="text-[#1677ff]" />
          评论与评分
          <span className="text-sm font-normal text-zinc-400">
            ({comments.length})
          </span>
        </h2>
        {avgRating > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-zinc-400">
              ({comments.filter((c) => c.rating).length} 条评分)
            </span>
          </div>
        )}
      </div>

      {/* 发表评论 */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">评分：</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition"
              >
                <Star
                  size={18}
                  className={
                    n <= (hoverRating || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-300 dark:text-zinc-600"
                  }
                />
              </button>
            ))}
            {rating > 0 && (
              <button
                type="button"
                onClick={() => setRating(0)}
                className="ml-2 text-xs text-zinc-400 hover:text-zinc-600"
              >
                清除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的使用体验或评价..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1677ff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} /> 发送
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          登录后即可发表评论和评分
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          暂无评论，来做第一个评论的人吧
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {c.authorName ? (
                    <Link
                      href={`/users/${encodeURIComponent(c.authorName)}`}
                      className="text-sm font-medium text-zinc-800 transition hover:text-[#1677ff] dark:text-zinc-200 dark:hover:text-[#5aa0ff]"
                    >
                      {c.authorName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      匿名
                    </span>
                  )}
                  {c.rating && (
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={
                            i < (c.rating ?? 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-200 dark:text-zinc-700"
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {new Date(c.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                  {user && (c.userId === user.id || user.role === "admin") && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-zinc-300 transition hover:text-red-500 dark:text-zinc-600"
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {c.content}
              </p>
              <div className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                {user ? (
                  <button
                    onClick={() => toggleLike(c.id)}
                    className={`inline-flex items-center gap-1 text-xs transition ${
                      likedComments.has(c.id)
                        ? "text-[#1677ff] dark:text-[#5aa0ff]"
                        : "text-zinc-400 hover:text-[#1677ff]"
                    }`}
                  >
                    <ThumbsUp
                      size={12}
                      fill={likedComments.has(c.id) ? "currentColor" : "none"}
                    />
                    {likedComments.has(c.id)
                      ? "已点赞"
                      : c.likes + (likeDelta[c.id] ?? 0) > 0
                        ? `点赞 ${c.likes + (likeDelta[c.id] ?? 0)}`
                        : "点赞"}
                  </button>
                ) : c.likes > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                    <ThumbsUp size={12} /> {c.likes}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
