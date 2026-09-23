"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, ShieldOff, Ban, Undo2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/admin";

interface UserRow {
  id: number;
  username: string;
  email?: string | null;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_META: Record<string, { label: string; className: string }> = {
  admin: { label: "管理员", className: "bg-[#1677ff]/10 text-[#1677ff] dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]" },
  user: { label: "普通用户", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: me } = useAuth();

  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeqRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    if (me && me.role !== "admin") router.replace("/");
  }, [me, router]);

  const load = useCallback(async () => {
    if (!me) return;
    // 竞态防护：搜索/筛选快速变化时并发多个请求，只有最后一次允许写入
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("q", search.trim());
      const data = await adminFetch<{ items: UserRow[]; total: number }>(
        `/admin/users?${params.toString()}`,
      );
      if (seq !== loadSeqRef.current) return;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [me, page, role, status, search, limit]);

  useEffect(() => {
    void (async () => {
      if (me?.role === "admin") await load();
    })();
  }, [load, me]);

  // 搜索输入防抖：300ms 后才触发查询，避免每个按键都发请求
  function onSearchInput(v: string) {
    setSearchInput(v);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 300);
  }

  const act = async (id: number, path: string, body: Record<string, string>) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetch(path, { method: "PATCH", body: JSON.stringify(body) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  const toggleBan = (row: UserRow) => {
    const next = row.status === "banned" ? "active" : "banned";
    if (next === "banned" && !window.confirm(`确定封禁用户「${row.username}」吗？`)) return;
    act(row.id, `/admin/users/${row.id}/status`, { status: next });
  };

  const toggleRole = (row: UserRow) => {
    const next = row.role === "admin" ? "user" : "admin";
    if (next === "user" && !window.confirm(`确定取消「${row.username}」的管理员权限吗？`)) return;
    act(row.id, `/admin/users/${row.id}/role`, { role: next });
  };

  if (me?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <PageHeader title="用户管理" description="查看用户列表，封禁/解封账号，变更角色权限。" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setRole("all"); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${role === "all" ? "bg-[#1677ff] text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"}`}
          >
            全部角色
          </button>
          <button
            onClick={() => { setRole("admin"); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${role === "admin" ? "bg-[#1677ff] text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"}`}
          >
            管理员
          </button>
          <button
            onClick={() => { setRole("user"); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${role === "user" ? "bg-[#1677ff] text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"}`}
          >
            普通用户
          </button>
          <button
            onClick={() => { setStatus("all"); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${status === "all" ? "bg-[#1677ff] text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"}`}
          >
            全部状态
          </button>
          <button
            onClick={() => { setStatus("banned"); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${status === "banned" ? "bg-rose-600 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"}`}
          >
            已封禁
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchInput);
                setPage(1);
              }
            }}
            placeholder="搜索用户名/邮箱…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 dark:border-zinc-700 dark:bg-zinc-900 sm:w-56"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">没有符合条件的用户</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">邮箱</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">注册时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((row) => {
                const roleMeta = ROLE_META[row.role] ?? ROLE_META.user;
                return (
                  <tr key={row.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.username}</span>
                        {row.id === me?.id && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            我
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 dark:text-zinc-400 md:table-cell">
                      {row.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleMeta.className}`}>
                        {roleMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "banned" ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                          已封禁
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-zinc-400 lg:table-cell">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString("zh-CN") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleRole(row)}
                          disabled={busyId === row.id || row.id === me?.id}
                          title={row.role === "admin" ? "取消管理员" : "设为管理员"}
                          className="rounded-lg p-1.5 text-[#1677ff] transition hover:bg-[#1677ff]/10 disabled:opacity-40 dark:text-[#5aa0ff] dark:hover:bg-[#5aa0ff]/10"
                        >
                          {row.role === "admin" ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                        </button>
                        <button
                          onClick={() => toggleBan(row)}
                          disabled={busyId === row.id || row.id === me?.id}
                          title={row.status === "banned" ? "解封" : "封禁"}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-500/10"
                        >
                          {row.status === "banned" ? <Undo2 size={15} /> : <Ban size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / limit))}
        onPageChange={setPage}
      />
    </div>
  );
}
