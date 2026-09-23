import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  showAccent?: boolean;
}

export default function SectionHeader({
  title,
  description,
  href,
  action,
  showAccent = true,
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex items-start gap-2.5">
        {showAccent && (
          <span className="mt-1.5 h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#1677ff] to-violet-500" />
        )}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {href && action && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-[#1677ff] transition hover:text-[#1677ff] dark:text-[#5aa0ff]"
        >
          {action} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
