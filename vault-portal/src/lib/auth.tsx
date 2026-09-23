"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface User {
  id: number;
  username: string;
  email?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  status: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  /** 资料编辑后重新拉取当前用户 */
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // 会话完全依赖 HttpOnly cookie：/me 依据 cookie 返回当前用户，响应体无 token
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUser(data.user ?? data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(username: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new Error("登录失败，请检查用户名和密码");
    }
    const data = await res.json();
    setUser(data.user ?? data);
  }

  async function register(username: string, email: string, password: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
      throw new Error("注册失败，用户名可能已存在");
    }
    const data = await res.json();
    setUser(data.user ?? data);
  }

  function logout() {
    // 调用后端清理 cookie，同时清空内存态
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(
      () => {},
    );
    setUser(null);
  }

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user ?? data);
    } catch {
      /* ignore */
    }
  }, []);

  // memo 化：避免每次 Provider 渲染都生成新 value，触发全部消费者重渲染
  const value = useMemo(
    () => ({ user, loading, login, register, logout, reload }),
    [user, loading, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
