"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    void (async () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    })();
  }, []);

  // memo 化：theme 未变化时不再向全部消费者广播新 value
  const value = useMemo(() => {
    const toggleTheme = () => {
      setTheme((prev) => {
        const next: Theme = prev === "dark" ? "light" : "dark";
        document.documentElement.classList.toggle("dark", next === "dark");
        try {
          localStorage.setItem("ai_portal_theme", next);
        } catch {
          // 忽略隐私模式下 localStorage 不可用的场景
        }
        return next;
      });
    };
    return { theme, toggleTheme };
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
