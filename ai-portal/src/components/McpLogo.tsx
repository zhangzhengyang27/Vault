import { getMcpLogo } from "@/lib/mcpLogos";

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function McpLogo({
  slug,
  name,
  size = 44,
}: {
  slug?: string;
  name?: string;
  size?: number;
}) {
  const logo = getMcpLogo(slug);
  const dim: React.CSSProperties = { width: size, height: size };
  if (logo) {
    return (
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-zinc-200/70 dark:bg-zinc-800/60 dark:ring-zinc-700/60"
        style={dim}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 外链 logo 任意域名，小图标无需优化管线 */}
        <img
          src={logo}
          alt={name || "logo"}
          loading="lazy"
          className="h-full w-full object-contain p-1"
        />
      </span>
    );
  }
  const init = (name || slug || "?").trim().charAt(0).toUpperCase();
  const hue = hueFromString(slug || name || "?");
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl text-sm font-bold leading-none"
      style={{
        ...dim,
        background: `hsl(${hue} 65% 92%)`,
        color: `hsl(${hue} 55% 38%)`,
      }}
      aria-hidden
    >
      {init}
    </span>
  );
}
