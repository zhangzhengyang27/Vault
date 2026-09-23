import type { ReactNode } from "react";

type TagVariant = "default" | "primary" | "success" | "warning" | "danger";
type TagShape = "rounded" | "pill";

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  shape?: TagShape;
  size?: "sm" | "xs";
  className?: string;
}

const VARIANT_CLASSES: Record<TagVariant, string> = {
  default:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  primary:
    "bg-[#1677ff]/10 text-[#1677ff] dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]",
  success:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning:
    "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  danger:
    "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

const SIZE_CLASSES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
};

export default function Tag({
  children,
  variant = "default",
  shape = "rounded",
  size = "sm",
  className = "",
}: TagProps) {
  const shapeClass = shape === "pill" ? "rounded-full" : "rounded-md";
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${VARIANT_CLASSES[variant]} ${shapeClass} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  );
}
