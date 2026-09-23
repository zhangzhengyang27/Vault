"use client";

import { ChevronDown, ArrowUpDown } from "lucide-react";

export type SortOption = "latest" | "popular" | "rating" | "name";

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  options?: { value: SortOption; label: string }[];
}

const DEFAULT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "最新发布" },
  { value: "popular", label: "最受欢迎" },
  { value: "rating", label: "评分最高" },
  { value: "name", label: "名称排序" },
];

export default function SortSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
}: SortSelectorProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <ArrowUpDown size={14} className="text-zinc-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortOption)}
          className="appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:focus:ring-indigo-500/20"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 text-zinc-400"
        />
      </div>
    </div>
  );
}
