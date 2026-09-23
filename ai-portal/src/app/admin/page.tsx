"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Sparkles,
  BookOpen,
  Newspaper,
  Users,
  MessagesSquare,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/admin";

interface AdminStats {
  tools: number;
  prompts: number;
  articles: number;
  news: number;
  users: number;
  posts: number;
  pending: number;
  pendingSubmissions: number;
  pendingContent: number;
}

interface TrendPoint {
  date: string;
  content: number;
  users: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, t] = await Promise.all([
          adminFetch<AdminStats>("/admin/stats"),
          adminFetch<TrendPoint[]>("/admin/stats/trend?days=7"),
        ]);
        setStats(s);
        setTrend(Array.isArray(t) ? t : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const cards = stats
    ? [
        { label: "收录工具", value: stats.tools, icon: Wrench, href: "/admin/content/tools" },
        { label: "提示词", value: stats.prompts, icon: Sparkles, href: "/admin/content/prompts" },
        { label: "文章", value: stats.articles, icon: BookOpen, href: "/admin/content/articles" },
        { label: "资讯", value: stats.news, icon: Newspaper, href: "/admin/content/news" },
        { label: "用户", value: stats.users, icon: Users, href: "/admin/users" },
        { label: "帖子", value: stats.posts, icon: MessagesSquare, href: "/community" },
      ]
    : [];

  const maxContent = Math.max(1, ...trend.map((t) => t.content));
  const maxUsers = Math.max(1, ...trend.map((t) => t.users));

  return (
    <div className="space-y-6">
      <PageHeader title="运营后台" description="站点内容、用户与待办的整体概览。" />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {cards.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#1677ff]/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#5aa0ff]/40"
                >
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Icon size={15} className="text-[#1677ff]" />
                    {s.label}
                  </div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {s.value}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 待办提醒 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  审核中心
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  待审核投稿 {stats?.pendingSubmissions ?? 0} 条
                  {stats?.pendingContent ? ` · 待审核采集内容 ${stats.pendingContent} 条` : ""}
                </p>
              </div>
              <Link
                href="/admin/review"
                className="inline-flex items-center gap-1 rounded-lg bg-[#1677ff]/10 px-3 py-1.5 text-sm font-medium text-[#1677ff] transition hover:bg-[#1677ff]/20 dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]"
              >
                去处理 <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* 近 7 日趋势 */}
          {trend.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                近 7 日趋势
              </h3>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>新增内容</span>
                    <span>峰值 {maxContent}</span>
                  </div>
                  <div className="flex h-20 items-end gap-1.5">
                    {trend.map((t) => (
                      <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-[#1677ff]/80 transition-all"
                          style={{ height: `${Math.max(3, (t.content / maxContent) * 64)}px` }}
                        />
                        <span className="text-[10px] text-zinc-400">{t.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>新增用户</span>
                    <span>峰值 {maxUsers}</span>
                  </div>
                  <div className="flex h-20 items-end gap-1.5">
                    {trend.map((t) => (
                      <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-emerald-500/70 transition-all"
                          style={{ height: `${Math.max(3, (t.users / maxUsers) * 64)}px` }}
                        />
                        <span className="text-[10px] text-zinc-400">{t.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 合规提醒 */}
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-4 dark:bg-rose-500/10">
            <ShieldAlert size={20} className="shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700 dark:text-rose-300">
              采集内容需保留来源并支持一键下架；用户投稿进入审核队列后再发布。ICP 备案与内容版权为高风险项【假设】。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
