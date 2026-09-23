"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-3 pt-4 ${className}`}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
      >
        <ChevronLeft size={14} /> 上一页
      </button>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
      >
        下一页 <ChevronRight size={14} />
      </button>
    </div>
  );
}
