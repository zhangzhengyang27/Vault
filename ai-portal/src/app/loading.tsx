export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-48 animate-pulse rounded-3xl bg-zinc-200/70 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
