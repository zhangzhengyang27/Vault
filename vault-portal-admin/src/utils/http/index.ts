import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type Method
} from "axios";
import { removeToken, getToken, setToken, userKey } from "@/utils/auth";
import { storageLocal } from "@pureadmin/utils";
import { router } from "@/router";
import { message } from "@/utils/message";

/**
 * axios 封装（与 api/*.ts 约定一致）：
 * - `http.request<T>("get", url)` / `http.request<T>("post", url, { data })`
 * - URL 由调用方拼好网关前缀（VITE_GATEWAY || "/api"），实例不再重复拼接
 * - 请求拦截器自动附带 `Authorization: Bearer <accessToken>`
 * - 响应拦截器直接返回 `data` 部分
 * - 401 时用 refreshToken 无感换发并重放原请求；失败则清登录态回登录页
 */

/** 网关前缀：与 src/api/*.ts 保持一致 */
export const GATEWAY = import.meta.env.VITE_GATEWAY || "/api";

const instance = axios.create({
  timeout: 60000,
  headers: { "Content-Type": "application/json" }
});

/** 是否正在刷新 token（并发 401 共享一次刷新） */
let refreshing: Promise<boolean> | null = null;

/** 从后端响应中提取 token 字段（兼容 token/accessToken/access_token 命名） */
function pickTokens(payload: any): {
  accessToken?: string;
  refreshToken?: string;
} {
  return {
    accessToken:
      payload?.access_token ?? payload?.accessToken ?? payload?.token ?? "",
    refreshToken: payload?.refresh_token ?? payload?.refreshToken ?? ""
  };
}

/** 用 refreshToken 无感换发 accessToken；成功返回 true */
async function doRefresh(): Promise<boolean> {
  const current = getToken();
  if (!current?.refreshToken) return false;
  try {
    // 用原生 axios（不走实例拦截器，避免递归 401）
    const res = await axios.post(`${GATEWAY}/auth/refresh`, {
      refreshToken: current.refreshToken
    });
    const data = res.data?.data ?? res.data;
    const { accessToken, refreshToken } = pickTokens(data);
    if (!accessToken) return false;
    // 更新 cookie 中的 token，并同步 localStorage 用户信息（保留 roles 等）
    const stored =
      storageLocal().getItem<Record<string, unknown>>(userKey) ?? {};
    setToken({
      accessToken,
      refreshToken: refreshToken || current.refreshToken,
      expires: 0,
      username: stored.username as string,
      nickname: stored.nickname as string,
      avatar: stored.avatar as string,
      roles: stored.roles as Array<string>,
      permissions: stored.permissions as Array<string>
    } as any);
    return true;
  } catch {
    return false;
  }
}

/** 清登录态并回登录页（不直接依赖 user store，避免循环引用） */
function forceLogout() {
  removeToken();
  if (router.currentRoute.value.path !== "/login") {
    router.push("/login");
  }
}

// 请求拦截：自动附带 Bearer accessToken
instance.interceptors.request.use(config => {
  const token = getToken();
  if (token?.accessToken) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token.accessToken}`);
    config.headers = headers;
  }
  return config;
});

// 响应拦截：直接返回 data；401 触发无感换发
instance.interceptors.response.use(
  response => response.data,
  async (error: AxiosError): Promise<any> => {
    const config = error?.config as
      | (AxiosRequestConfig & { __retried?: boolean })
      | undefined;

    if (error?.response?.status === 401 && config && !config.__retried) {
      config.__retried = true;
      refreshing = refreshing ?? doRefresh();
      const ok = await refreshing;
      refreshing = null;
      if (ok) {
        // 换发成功：重放原请求
        return instance.request(config);
      }
      // 换发失败：清登录态回登录页
      message("登录已过期，请重新登录", { type: "warning" });
      forceLogout();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

class Http {
  /** `http.request<T>("get", url)` / `http.request<T>("post", url, { data })` */
  request<T>(
    method: Method | string,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // 响应拦截器已直接返回 data 部分，故以 T 作为结果类型
    return instance.request<any, any>({
      method: method as Method,
      url,
      ...config
    });
  }
}

export const http = new Http();
