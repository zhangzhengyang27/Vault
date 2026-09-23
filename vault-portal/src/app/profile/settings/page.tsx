"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

export default function ProfileSettingsPage() {
  const { user, loading, reload } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // 表单初值跟随 user：null 表示尚未初始化，避免覆盖正在输入的内容
  if (user && nickname === null) {
    setNickname(user.nickname ?? "");
    setBio(user.bio ?? "");
    setAvatar(user.avatar ?? "");
    setEmail(user.email ?? "");
  }

  if (!loading && !user) {
    return (
      <div className="py-20 text-center text-sm text-zinc-400">
        请先
        <Link href="/login" className="mx-1 text-[#1677ff] hover:underline">
          登录
        </Link>
        后编辑资料。
      </div>
    );
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname, bio, avatar, email }),
      });
      if (res.ok) {
        await reload();
        setMessage({ ok: true, text: "保存成功" });
        // 他人主页/帖子详情显示的资料即时生效，回个人中心
        setTimeout(() => router.push("/profile"), 600);
      } else {
        const data = await res.json().catch(() => null);
        setMessage({
          ok: false,
          text:
            data?.message ?? "保存失败，请检查输入（昵称≤30字，简介≤200字）",
        });
      }
    } catch {
      setMessage({ ok: false, text: "网络错误，请稍后重试" });
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#1677ff] dark:border-zinc-700 dark:text-zinc-100";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          编辑资料
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          资料展示在社区帖子、你的主页与个人中心
        </p>
      </div>

      <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* 头像预览 */}
        <div className="flex items-center gap-4">
          <Avatar
            name={nickname || user?.username || "?"}
            src={avatar || user?.avatar}
            size={56}
            rounded="rounded-xl"
          />
          <div className="flex-1">
            <label className="mb-1 block text-xs text-zinc-400">
              头像图片地址（URL）
            </label>
            <input
              value={avatar ?? ""}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className={inputCls}
              maxLength={500}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            昵称（留空则显示用户名）
          </label>
          <input
            value={nickname ?? ""}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="最多 30 个字"
            className={inputCls}
            maxLength={30}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">个人简介</label>
          <textarea
            value={bio ?? ""}
            onChange={(e) => setBio(e.target.value)}
            placeholder="介绍一下自己（最多 200 字）"
            rows={3}
            className={`${inputCls} resize-none`}
            maxLength={200}
          />
          <p className="mt-1 text-right text-xs text-zinc-300">
            {(bio ?? "").length} / 200
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">邮箱</label>
          <input
            type="email"
            value={email ?? ""}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="用于找回密码等账号安全场景"
            className={inputCls}
          />
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.ok ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#1677ff] px-6 py-2 text-sm text-white transition hover:bg-[#4096ff] disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          <Link
            href="/profile"
            className="rounded-lg border border-zinc-200 px-6 py-2 text-sm text-zinc-600 transition hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
          >
            取消
          </Link>
        </div>
      </section>
    </div>
  );
}
