import Link from "next/link";
import type { ReactNode } from "react";

interface ListItemProps {
  href?: string;
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ListItem({
  href,
  icon,
  iconBg = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  title,
  description,
  meta,
  onClick,
  className = "",
}: ListItemProps) {
  const content = (
    <>
      {icon && (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {meta && (
        <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          {meta}
        </div>
      )}
    </>
  );

  const baseClass = `group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/60 ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <div className={baseClass} onClick={onClick} role={onClick ? "button" : undefined}>
      {content}
    </div>
  );
}
