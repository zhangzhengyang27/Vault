"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";

export type SubscriptionTargetType = "category" | "tag" | "keyword";

export interface Subscription {
  id: number;
  targetType: SubscriptionTargetType;
  targetValue: string;
  active: boolean;
  createdAt: string;
}

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    if (!user) {
      setSubscriptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void (async () => {
      await fetchSubscriptions();
    })();
  }, [fetchSubscriptions]);

  const subscribe = useCallback(
    async (targetType: SubscriptionTargetType, targetValue: string) => {
      if (!user) return false;
      try {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetType, targetValue }),
        });
        if (res.ok) {
          const sub = await res.json();
          setSubscriptions((prev) => [...prev, sub]);
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    },
    [user],
  );

  const unsubscribe = useCallback(
    async (id: number) => {
      if (!user) return;
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      try {
        await fetch(`/api/subscriptions/${id}`, {
          method: "DELETE",
        });
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  const isSubscribed = useCallback(
    (targetType: SubscriptionTargetType, targetValue: string) => {
      return subscriptions.some(
        (s) => s.targetType === targetType && s.targetValue === targetValue,
      );
    },
    [subscriptions],
  );

  return {
    subscriptions,
    loading,
    subscribe,
    unsubscribe,
    isSubscribed,
    refresh: fetchSubscriptions,
  };
}
