import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export default function Breadcrumb({
  items,
  showHome = true,
}: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "首页", href: "/" }, ...items]
    : items;

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-zinc-400 dark:text-zinc-500">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={12} className="shrink-0" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
              >
                {index === 0 && showHome ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Home size={12} />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            ) : (
              <span
                className={`truncate ${isLast ? "text-zinc-600 dark:text-zinc-300" : ""}`}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
