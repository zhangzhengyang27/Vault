import type { ReactNode } from "react";

interface DetailLayoutProps {
  breadcrumb?: { label: string; href?: string }[];
  main: ReactNode;
  sidebar: ReactNode;
  className?: string;
}

/** 详情页双栏骨架（codefather 同款：主列 + 300px 吸顶侧栏，16px 间距） */
export default function DetailLayout({
  breadcrumb,
  main,
  sidebar,
  className = "",
}: DetailLayoutProps) {
  return (
    <div className={className}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-zinc-400 dark:text-zinc-500">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && <span className="text-zinc-300 dark:text-zinc-600">/</span>}
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="transition hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={`truncate ${isLast ? "text-zinc-600 dark:text-zinc-300" : ""}`}>
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">{main}</div>
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">{sidebar}</div>
        </aside>
      </div>
    </div>
  );
}
