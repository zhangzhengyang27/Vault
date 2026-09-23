"use client";

import { useState, useEffect, useCallback } from "react";

export interface HistoryItem {
  type: string;
  slug: string;
  title: string;
  path: string;
  timestamp: number;
}

const STORAGE_KEY = "ai-portal-history";
const MAX_ITEMS = 50;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 初始化加载
  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setHistory(JSON.parse(raw));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // 保存到 localStorage
  const save = useCallback((items: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, []);

  // 添加记录
  const addHistory = useCallback(
    (item: Omit<HistoryItem, "timestamp">) => {
      setHistory((prev) => {
        // 去重：同一路径只保留最新
        const filtered = prev.filter((h) => h.path !== item.path);
        const next = [{ ...item, timestamp: Date.now() }, ...filtered].slice(
          0,
          MAX_ITEMS,
        );
        save(next);
        return next;
      });
    },
    [save],
  );

  // 清除单条
  const removeHistory = useCallback(
    (path: string) => {
      setHistory((prev) => {
        const next = prev.filter((h) => h.path !== path);
        save(next);
        return next;
      });
    },
    [save],
  );

  // 清除全部
  const clearHistory = useCallback(() => {
    setHistory([]);
    save([]);
  }, [save]);

  return { history, addHistory, removeHistory, clearHistory };
}
