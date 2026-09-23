import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const actionButton = actionLabel ? (
    actionHref ? (
      <Link
        href={actionHref}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-zinc-400 dark:text-zinc-500">
          {description}
        </p>
      )}
      {actionButton}
    </div>
  );
}
