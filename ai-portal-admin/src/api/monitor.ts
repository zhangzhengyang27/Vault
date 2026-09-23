import { http } from "@/utils/http";

/** 网关前缀：与 src/api/user.ts 保持一致（开发走 vite 代理，生产可指向独立域名） */
const GATEWAY = import.meta.env.VITE_GATEWAY || "/api";

const url = (path: string) => `${GATEWAY}${path}`;

/** 错误信息提取（views 从本模块导入；实现复用 admin.ts，避免重复代码） */
export { errMsg } from "./admin";

// ============ 登录日志 ============

export interface LoginLogItem {
  id: number;
  userId: number | null;
  username: string;
  success: boolean;
  message: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export const getLoginLogs = (params: {
  page: number;
  limit: number;
  username?: string;
  success?: string;
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  if (params.username) query.set("username", params.username);
  if (params.success && params.success !== "all")
    query.set("success", params.success);
  return http.request<{ items: LoginLogItem[]; total: number }>(
    "get",
    url(`/admin/logs/login-logs?${query.toString()}`)
  );
};

export const deleteLoginLog = (id: number) =>
  http.request<void>("delete", url(`/admin/logs/login-logs/${id}`));

export const clearLoginLogs = () =>
  http.request<void>("delete", url("/admin/logs/login-logs"));

// ============ 操作日志 ============

export interface OperLogItem {
  id: number;
  userId: number | null;
  username: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
  durationMs: number;
  body: string | null;
  createdAt: string;
}

export const getOperLogs = (params: {
  page: number;
  limit: number;
  username?: string;
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  if (params.username) query.set("username", params.username);
  return http.request<{ items: OperLogItem[]; total: number }>(
    "get",
    url(`/admin/logs/oper-logs?${query.toString()}`)
  );
};

export const getOperLogDetail = (id: number) =>
  http.request<OperLogItem>("get", url(`/admin/logs/oper-logs/${id}`));

export const deleteOperLog = (id: number) =>
  http.request<void>("delete", url(`/admin/logs/oper-logs/${id}`));

export const clearOperLogs = () =>
  http.request<void>("delete", url("/admin/logs/oper-logs"));

// ============ 在线用户 ============

export interface OnlineUserItem {
  userId: number;
  username: string;
  role: string;
  ip: string | null;
  userAgent: string | null;
  lastSeen: number;
}

export const getOnlineUsers = () =>
  http.request<OnlineUserItem[]>("get", url("/admin/logs/online-users"));

export const forceLogout = (userId: number) =>
  http.request<void>("delete", url(`/admin/logs/online-users/${userId}`));
