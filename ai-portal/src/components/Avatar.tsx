"use client";

const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

export default function Avatar({
  name,
  src,
  size = 38,
  rounded = "rounded-md",
}: {
  name: string;
  /** 头像图片 URL，空/加载失败回退首字母色块 */
  src?: string | null;
  size?: number;
  rounded?: string;
}) {
  // 按名字长度稳定取色：同名用户永远同一颜色
  const gradient = GRADIENTS[(name ?? "").length % GRADIENTS.length];
  if (src) {
    return (
      // 图片加载失败时隐藏 img，露出底层首字母色块兜底
      <span
        className={`${rounded} relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} text-sm font-bold text-white`}
        style={{ width: size, height: size }}
      >
        {name?.[0] ?? "?"}
        {/* eslint-disable-next-line @next/next/no-img-element -- 头像外链域名不定，next/image 需白名单 */}
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </span>
    );
  }
  return (
    <span
      className={`${rounded} flex shrink-0 items-center justify-center bg-gradient-to-br ${gradient} text-sm font-bold text-white`}
      style={{ width: size, height: size }}
    >
      {name?.[0] ?? "?"}
    </span>
  );
}
