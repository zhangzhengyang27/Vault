/** 后台管理接口封装：会话由 HttpOnly cookie 携带（同源自动发送），非 2xx 抛错 */

export async function adminFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body && typeof init.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `请求失败 (${res.status})`;
    try {
      const json = JSON.parse(text);
      if (json.message) msg = Array.isArray(json.message) ? json.message.join("; ") : json.message;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const CONTENT_STATUS_META: Record<string, { label: string; className: string }> = {
  published: { label: "已发布", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  draft: { label: "草稿", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  pending: { label: "待审核", className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  archived: { label: "已归档", className: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" },
  rejected: { label: "已拒绝", className: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
};

export const CONTENT_STATUSES = ["published", "draft", "pending", "archived", "rejected"] as const;
