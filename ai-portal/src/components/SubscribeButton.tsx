"use client";

import { useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { useSubscriptions, type SubscriptionTargetType } from "@/lib/useSubscriptions";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

interface SubscribeButtonProps {
  targetType: SubscriptionTargetType;
  targetValue: string;
  label?: string;
  className?: string;
}

export default function SubscribeButton({
  targetType,
  targetValue,
  label,
  className = "",
}: SubscribeButtonProps) {
  const { user } = useAuth();
  const { subscriptions, subscribe, unsubscribe } = useSubscriptions();
  const [loading, setLoading] = useState(false);

  const currentSub = subscriptions.find(
    (s) => s.targetType === targetType && s.targetValue === targetValue,
  );
  const subscribed = !!currentSub;

  const handleClick = async () => {
    if (!user) return;
    setLoading(true);
    if (subscribed && currentSub) {
      await unsubscribe(currentSub.id);
    } else {
      await subscribe(targetType, targetValue);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-500/60 dark:hover:text-indigo-400 ${className}`}
      >
        <Bell size={13} /> {label || "订阅更新"}
      </Link>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        subscribed
          ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400"
          : "border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-500/60 dark:hover:text-indigo-400"
      } ${className}`}
    >
      {subscribed ? (
        <>
          <Check size={13} /> 已订阅
        </>
      ) : (
        <>
          <BellRing size={13} /> {label || "订阅更新"}
        </>
      )}
    </button>
  );
}
