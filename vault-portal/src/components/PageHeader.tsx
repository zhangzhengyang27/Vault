import type { ReactNode } from "react";
import Breadcrumb from "@/components/Breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb items={breadcrumb} />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
