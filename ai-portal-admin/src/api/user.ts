import { http } from "@/utils/http";
import type { DataInfo } from "@/utils/auth";

/** 网关前缀：与 src/api/admin.ts 保持一致（开发走 vite 代理，生产可指向独立域名） */
const GATEWAY = import.meta.env.VITE_GATEWAY || "/api";

const url = (path: string) => `${GATEWAY}${path}`;

/** /auth/me 返回的用户信息 */
export interface UserInfo {
  id?: number;
  username?: string;
  nickname?: string;
  email?: string | null;
  avatar?: string | null;
  role?: string;
  roles?: Array<string>;
  permissions?: Array<string>;
}

/** 后端登录/刷新接口的原始响应（字段名做多版本兼容） */
interface AuthPayload {
  access_token?: string;
  accessToken?: string;
  token?: string;
  refresh_token?: string;
  refreshToken?: string;
  expires?: number;
  user?: UserInfo;
  message?: string | Array<string>;
}

/** store 约定的结果结构：code === 0 表示成功，data 为 DataInfo */
export type UserResult = {
  code: number;
  message?: string;
  data: DataInfo<number>;
};

export type RefreshTokenResult = UserResult;

/** 通用包装结果（账户设置页使用） */
export type ApiResult<T = unknown> = {
  code: number;
  message?: string;
  data: T;
};

/** 从后端原始载荷映射为 store 的 DataInfo */
function toDataInfo(payload: AuthPayload, fallbackUsername?: string): DataInfo<number> | null {
  const accessToken =
    payload?.access_token ?? payload?.accessToken ?? payload?.token ?? "";
  if (!accessToken) return null;
  const user = payload?.user ?? {};
  const roles =
    user.roles && user.roles.length
      ? user.roles
      : [user.role ?? "user"];
  const nickname = user.nickname ?? user.username ?? fallbackUsername ?? "";
  return {
    accessToken,
    refreshToken: payload?.refresh_token ?? payload?.refreshToken ?? "",
    expires:
      typeof payload?.expires === "number" && payload.expires > 0
        ? payload.expires
        : Date.now() + 7 * 24 * 60 * 60 * 1000, // access 7d
    avatar: user.avatar ?? "",
    username: user.username ?? fallbackUsername ?? "",
    nickname,
    roles,
    permissions: user.permissions ?? ["*:*:*"]
  };
}

/** 登录（POST /auth/login）：后端校验 role=admin，非管理员直接拒绝 */
export function getLogin(
  data: { username: string; password: string }
): Promise<UserResult> {
  return http
    .request<AuthPayload>("post", url("/auth/login"), { data })
    .then(payload => {
      const info = toDataInfo(payload, data.username);
      if (info) {
        return { code: 0, message: "ok", data: info } as UserResult;
      }
      return {
        code: 1,
        message: (payload?.message as string) ?? "登录失败：缺少 accessToken",
        data: null as unknown as DataInfo<number>
      } as UserResult;
    });
}

/** 刷新 token（POST /auth/refresh） */
export function refreshTokenApi(
  data: { refreshToken: string }
): Promise<RefreshTokenResult> {
  return http
    .request<AuthPayload>("post", url("/auth/refresh"), { data })
    .then(payload => {
      const info = toDataInfo(payload);
      if (info) {
        // 刷新时保留本地用户信息（后端 refresh 不一定回传 user）
        return { code: 0, message: "ok", data: info } as RefreshTokenResult;
      }
      return {
        code: 1,
        message: "刷新登录态失败",
        data: null as unknown as DataInfo<number>
      } as RefreshTokenResult;
    });
}

/** 退出登录（POST /auth/logout，前端仍以本地清理为准） */
export function logoutApi(): Promise<void> {
  return http.request<void>("post", url("/auth/logout"));
}

/** 获取当前用户信息（GET /auth/me） */
export function getMe(): Promise<ApiResult<UserInfo | null>> {
  return http
    .request<UserInfo>("get", url("/auth/me"))
    .then(user => ({ code: 0, message: "ok", data: user }))
    .catch(() => ({ code: 1, message: "获取用户信息失败", data: null }));
}

/** 更新个人资料（邮箱等） */
export function updateProfile(data: { email?: string }): Promise<ApiResult> {
  return http
    .request<unknown>("put", url("/auth/profile"), { data })
    .then(() => ({ code: 0, message: "ok", data: null }))
    .catch(err => {
      const msg = (err?.response?.data as any)?.message;
      return {
        code: 1,
        message: Array.isArray(msg) ? msg.join("；") : msg ?? "保存失败",
        data: null
      };
    });
}

/** 修改密码 */
export function updatePassword(data: {
  oldPassword: string;
  newPassword: string;
}): Promise<ApiResult> {
  return http
    .request<unknown>("put", url("/auth/password"), { data })
    .then(() => ({ code: 0, message: "ok", data: null }))
    .catch(err => {
      const msg = (err?.response?.data as any)?.message;
      return {
        code: 1,
        message: Array.isArray(msg) ? msg.join("；") : msg ?? "修改失败",
        data: null
      };
    });
}
