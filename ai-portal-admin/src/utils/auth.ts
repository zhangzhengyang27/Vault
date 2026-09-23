import Cookies from "js-cookie";
import { storageLocal } from "@pureadmin/utils";

/**
 * 登录态存取（Bearer 双 token：access 7d / refresh 30d）。
 * - TokenKey cookie：accessToken + 过期时间（供拦截器/守卫同步读取）
 * - multipleTabsKey cookie：登录标记（路由守卫据此判断已登录）
 * - userKey localStorage：完整用户信息（username/roles/permissions 等）
 */

export const userKey = "user-info";
/** `token` cookie 的 key */
export const TokenKey = "authorized-token";
/** 登录标记 cookie 的 key（多标签页共享登录态） */
export const multipleTabsKey = "authorized-no-tabs";

/** 用户信息（localStorage 中的 userKey 结构） */
export interface DataInfo<T> {
  /** 访问令牌（7d） */
  accessToken: string;
  /** 刷新令牌（30d） */
  refreshToken: string;
  /** accessToken 过期时间（时间戳或 Date） */
  expires: T;
  avatar?: string;
  username?: string;
  nickname?: string;
  /** 页面级别权限 */
  roles?: Array<string>;
  /** 按钮级别权限 */
  permissions?: Array<string>;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  /** 过期时间戳（毫秒） */
  expires: number;
}

const ACCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // access 7d
const REFRESH_TTL_DAYS = 30; // refresh 30d

/** 获取`token`（不存在返回 undefined） */
export function getToken(): TokenInfo | undefined {
  const raw = Cookies.get(TokenKey);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as TokenInfo;
  } catch {
    return undefined;
  }
}

/**
 * 写入登录态：cookie（token + 登录标记）与 localStorage（用户信息）。
 * 兼容 expires 为时间戳或 Date 两种入参；未传时按 access 7d 推算。
 */
export function setToken(data: DataInfo<Date | number>): void {
  const { accessToken, refreshToken } = data;
  if (!accessToken) return;

  let expires = 0;
  if (data.expires instanceof Date) {
    expires = data.expires.getTime();
  } else if (typeof data.expires === "number" && data.expires > 0) {
    expires = data.expires;
  } else {
    expires = Date.now() + ACCESS_TTL_MS;
  }

  Cookies.set(
    TokenKey,
    JSON.stringify({ accessToken, refreshToken, expires }),
    {
      expires: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      sameSite: "lax"
    }
  );
  Cookies.set(multipleTabsKey, multipleTabsKey, {
    expires: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    sameSite: "lax"
  });

  const stored = storageLocal().getItem<DataInfo<number>>(userKey) ?? ({} as any);
  storageLocal().setItem(userKey, {
    ...stored,
    accessToken,
    refreshToken,
    expires,
    avatar: data.avatar ?? stored.avatar ?? "",
    username: data.username ?? stored.username ?? "",
    nickname: data.nickname ?? stored.nickname ?? "",
    roles: data.roles ?? stored.roles ?? [],
    permissions: data.permissions ?? stored.permissions ?? []
  });
}

/** 清空登录态（cookie 与 localStorage 用户信息） */
export function removeToken(): void {
  Cookies.remove(TokenKey);
  Cookies.remove(multipleTabsKey);
  storageLocal().removeItem(userKey);
}
