"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";

export interface Notification {
  id: number;
  type: string;
  title: string;
  content?: string | null;
  targetType: string;
  targetId?: number | null;
  targetSlug?: string | null;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        fetch("/api/notifications?limit=20", {
        }),
        fetch("/api/notifications/unread-count", {
        }),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setNotifications(Array.isArray(data) ? data : data.items ?? []);
      }
      if (countRes.ok) {
        const data = await countRes.json();
        setUnreadCount(typeof data === "number" ? data : data.count ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void (async () => {
      await fetchNotifications();
    })();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: number) => {
      if (!user) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await fetch(`/api/notifications/${id}/read`, {
          method: "PATCH",
        });
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
    } catch {
      /* ignore */
    }
  }, [user]);

  const removeNotification = useCallback(
    (id: number) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [],
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refresh: fetchNotifications,
  };
}
