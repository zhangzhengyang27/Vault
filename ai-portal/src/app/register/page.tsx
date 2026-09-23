"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-md">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1677ff] text-white shadow-sm">
            <Sparkles size={22} />
          </div>
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            创建账号
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            开始收藏与发帖，打造你的 AI 工具箱。
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              用户名
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-[#5aa0ff] dark:focus:ring-[#5aa0ff]/20"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              邮箱（可选）
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#1677ff] px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#4096ff] disabled:opacity-60"
          >
            {loading ? "注册中…" : "注册"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          已有账号？{" "}
          <Link
            href="/login"
            className="font-medium text-[#1677ff] hover:text-[#4096ff] dark:text-[#5aa0ff]"
          >
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
