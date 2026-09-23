const PHASES: Record<string, { label: string; className: string }> = {
  mvp: {
    label: "MVP",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  v1: {
    label: "迭代1",
    className:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
  v2: {
    label: "迭代2",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
};

export default function PhaseBadge({ phase }: { phase: string }) {
  const p = PHASES[phase] ?? PHASES.mvp;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${p.className}`}
    >
      {p.label}
    </span>
  );
}
