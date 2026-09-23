"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1677ff] text-white shadow-sm hover:bg-[#4096ff] disabled:bg-[#1677ff]/40 disabled:cursor-not-allowed dark:bg-[#1677ff] dark:hover:bg-[#4096ff]",
  secondary:
    "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-500 disabled:bg-rose-300 disabled:cursor-not-allowed",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
