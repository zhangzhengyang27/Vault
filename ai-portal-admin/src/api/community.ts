import { http } from "@/utils/http";

/** 网关前缀：与 src/api/user.ts 保持一致（开发走 vite 代理，生产可指向独立域名） */
const GATEWAY = import.meta.env.VITE_GATEWAY || "/api";

const url = (path: string) => `${GATEWAY}${path}`;

/** 错误信息提取（views 从本模块导入；实现复用 admin.ts，避免重复代码） */
export { errMsg } from "./admin";

// ============ 帖子管理 ============

export interface AdminPostItem {
  id: number;
  title: string;
  content: string;
  authorName: string;
  authorUsername: string | null;
  likes: number;
  comments: number;
  status: string;
  phase: string;
  createdAt: string;
}

export const getAdminPosts = (params: {
  page: number;
  limit: number;
  q?: string;
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  if (params.q?.trim()) query.set("q", params.q.trim());
  return http.request<{ items: AdminPostItem[]; total: number }>(
    "get",
    url(`/admin/community/posts?${query.toString()}`)
  );
};

export const setPostStatus = (id: number, status: "published" | "hidden") =>
  http.request<{ success: boolean }>(
    "patch",
    url(`/admin/community/posts/${id}/status`),
    { data: { status } }
  );

export const deleteAdminPost = (id: number) =>
  http.request<{ success: boolean }>(
    "delete",
    url(`/admin/community/posts/${id}`)
  );

// ============ 评论管理 ============

export interface AdminCommentItem {
  id: number;
  authorName: string;
  authorUsername: string | null;
  targetType: string;
  targetId: number | null;
  postTitle: string | null;
  content: string;
  rating?: number | null;
  createdAt: string;
}

export const getAdminComments = (params: {
  page: number;
  limit: number;
  q?: string;
  targetType?: string;
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.targetType && params.targetType !== "all")
    query.set("targetType", params.targetType);
  return http.request<{ items: AdminCommentItem[]; total: number }>(
    "get",
    url(`/admin/community/comments?${query.toString()}`)
  );
};

export const deleteAdminComment = (id: number) =>
  http.request<{ success: boolean }>(
    "delete",
    url(`/admin/community/comments/${id}`)
  );
