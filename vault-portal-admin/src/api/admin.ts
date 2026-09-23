import { http } from "@/utils/http";

/** 网关前缀：与 src/api/user.ts 保持一致（开发走 vite 代理，生产可指向独立域名） */
const GATEWAY = import.meta.env.VITE_GATEWAY || "/api";

const url = (path: string) => `${GATEWAY}${path}`;

/** 在线用户接口（welcome 概览页从本模块导入；实现见 monitor.ts） */
export { getOnlineUsers } from "./monitor";

type Msg = { message?: string | string[]; statusCode?: number };

/** 提取后端错误信息（class-validator 校验失败时 message 为数组） */
export function errMsg(err: any, fallback = "请求失败"): string {
  const data = err?.response?.data ?? err;
  const msg = (data as Msg)?.message;
  if (Array.isArray(msg)) return msg.join("；");
  if (typeof msg === "string" && msg) return msg;
  return fallback;
}

// ============ 运营概览 ============

export interface AdminStats {
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

export interface TrendPoint {
  date: string;
  content: number;
  users: number;
}

export const getStats = () =>
  http.request<AdminStats>("get", url("/admin/stats"));

export const getStatsTrend = (days = 7) =>
  http.request<TrendPoint[]>("get", url(`/admin/stats/trend?days=${days}`));

// ============ 内容管理（tools/prompts/articles/news）============

export type ContentType =
  | "tools"
  | "prompts"
  | "articles"
  | "news"
  | "mcps"
  | "repos"
  | "resources";

export interface ContentItem {
  id: number;
  slug: string;
  status?: string;
  createdAt?: string;
  category?: { id: number; name: string } | null;
  [key: string]: unknown;
}

export interface ContentListResult {
  items: ContentItem[];
  total: number;
}

export const getContentList = (
  type: ContentType,
  params: { page: number; limit: number; status?: string; q?: string }
) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.q?.trim()) query.set("q", params.q.trim());
  return http.request<ContentListResult>(
    "get",
    url(`/admin/content/${type}?${query.toString()}`)
  );
};

export const createContent = (type: ContentType, body: object) =>
  http.request<ContentItem>("post", url(`/admin/content/${type}`), { data: body });

export const updateContent = (
  type: ContentType,
  id: number,
  body: object
) =>
  http.request<ContentItem>("patch", url(`/admin/content/${type}/${id}`), {
    data: body
  });

export const deleteContent = (type: ContentType, id: number) =>
  http.request<void>("delete", url(`/admin/content/${type}/${id}`));

// ============ 采集审核 ============

export type ReviewType =
  | "news"
  | "tool"
  | "prompt"
  | "github"
  | "knowledge"
  | "mcp"
  | "resource";

export interface ReviewItem {
  id: number;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  url?: string;
  status: string;
  createdAt?: string;
}

export type ReviewStatus = "pending" | "published" | "rejected";

export const getReviewList = (type: ReviewType, status: ReviewStatus = "pending") =>
  http.request<ReviewItem[]>(
    "get",
    url(`/crawler/review/${type}?status=${status}`)
  );

export const reviewOne = (
  type: ReviewType,
  id: number,
  action: "approve" | "reject"
) => http.request<void>("patch", url(`/crawler/review/${type}/${id}/${action}`));

export interface BatchResult {
  updated: number;
  remaining: number;
}

export const reviewBatch = (
  type: ReviewType,
  action: "approve" | "reject",
  ids?: number[],
  status?: ReviewStatus
) =>
  http.request<BatchResult>("post", url(`/crawler/review/${type}/batch`), {
    data: { action, ids, status }
  });

// ============ 数据源管理 ============

export interface CrawlSource {
  id: number;
  name: string;
  url: string;
  sourceType: string;
  crawlInterval: string;
  enabled: boolean;
  status: string;
  description?: string | null;
  lastError: string;
  lastCrawledAt?: string | null;
  successCount: number;
  failCount: number;
  createdAt: string;
}

export interface CrawlLog {
  id: number;
  sourceId?: number | null;
  sourceName?: string;
  status?: string;
  message?: string;
  createdAt?: string;
  level?: string;
  type?: string;
}

export const getSources = () =>
  http.request<CrawlSource[]>("get", url("/crawler/sources"));

export const createSource = (body: {
  name: string;
  url: string;
  sourceType: string;
  crawlInterval: string;
  enabled: boolean;
  description?: string;
}) => http.request<CrawlSource>("post", url("/crawler/sources"), { data: body });

export const updateSource = (id: number, body: object) =>
  http.request<CrawlSource>("patch", url(`/crawler/sources/${id}`), { data: body });

export const deleteSource = (id: number) =>
  http.request<void>("delete", url(`/crawler/sources/${id}`));

export const runSource = (id: number) =>
  http.request<unknown>("post", url(`/crawler/sources/${id}/run`));

export const runAllSources = () =>
  http.request<string | Record<string, unknown>>("post", url("/crawler/run"));

export const getCrawlLogs = (limit = 20) =>
  http.request<CrawlLog[]>("get", url(`/crawler/logs?limit=${limit}`));

// ============ 用户管理 ============

export interface UserRow {
  id: number;
  username: string;
  email?: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export const getUserList = (params: {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  q?: string;
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  if (params.role && params.role !== "all") query.set("role", params.role);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.q?.trim()) query.set("q", params.q.trim());
  return http.request<{ items: UserRow[]; total: number }>(
    "get",
    url(`/admin/users?${query.toString()}`)
  );
};

export const updateUserStatus = (id: number, status: "active" | "banned") =>
  http.request<void>("patch", url(`/admin/users/${id}/status`), {
    data: { status }
  });

export const updateUserRole = (id: number, role: "user" | "admin") =>
  http.request<void>("patch", url(`/admin/users/${id}/role`), { data: { role } });

// ============ 分类管理 ============

export interface Category {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
}

export const getCategories = () =>
  http.request<Category[]>("get", url("/categories"));

export const createCategory = (body: {
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
}) => http.request<Category>("post", url("/categories"), { data: body });

export const updateCategory = (id: number, body: object) =>
  http.request<Category>("patch", url(`/categories/${id}`), { data: body });

export const deleteCategory = (id: number) =>
  http.request<void>("delete", url(`/categories/${id}`));

// ============ 投稿审核 ============

export interface Submission {
  id: number;
  type: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  contact?: string;
  status: string;
  userId: number;
  createdAt: string;
  reviewedAt?: string;
  rejectReason?: string;
}

export const getSubmissions = (status: string) =>
  http.request<Submission[]>(
    "get",
    url(`/submissions/admin/list${status !== "all" ? `?status=${status}` : ""}`)
  );

export const approveSubmission = (id: number) =>
  http.request<void>("post", url(`/submissions/${id}/approve`));

export const rejectSubmission = (id: number, reason?: string) =>
  http.request<void>("post", url(`/submissions/${id}/reject`), {
    data: { reason }
  });

// ============ 举报管理 ============

export interface ReportItem {
  id: number;
  targetType: string;
  targetId: number;
  targetTitle?: string | null;
  reason: string;
  reporter?: string | null;
  status: string;
  createdAt: string;
}

export const getReports = (status: string) =>
  http.request<ReportItem[] | { items: ReportItem[] }>(
    "get",
    url(`/reports?limit=50${status !== "all" ? `&status=${status}` : ""}`)
  );

export const updateReportStatus = (id: number, status: "open" | "resolved") =>
  http.request<void>("patch", url(`/reports/${id}/status`), { data: { status } });
