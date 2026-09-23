"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Star,
  Eye,
  Wrench,
  Sparkles,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  Code2,
  Bot,
  FileText,
  Video,
  Music,
  Palette,
  Brain,
  Globe,
  type LucideIcon,
} from "lucide-react";

interface ToolCardData {
  slug: string;
  name: string;
  desc: string;
  tags: string[];
  rating: number;
  phase: string;
}

interface PromptCardData {
  slug: string;
  title: string;
  desc: string;
  category: string;
  author: string;
  uses: number;
  phase: string;
  isNew?: boolean;
  manual?: boolean;
}

/** 工具图标映射：按名称/tags 关键词匹配，返回图标和渐变色 */
const TOOL_ICON_MAP: { keys: string[]; icon: LucideIcon; gradient: string }[] = [
  { keys: ["chat", "对话", "聊天", "gpt", "claude", "gemini", "智能体", "agent", "bot"], icon: Bot, gradient: "from-[#1677ff] to-violet-500" },
  { keys: ["图像", "图片", "绘画", "画", "image", "photo", "midjourney", "stable", "diffusion"], icon: ImageIcon, gradient: "from-pink-500 to-rose-500" },
  { keys: ["代码", "编程", "开发", "code", "github", "cursor", "copilot", "编程"], icon: Code2, gradient: "from-emerald-500 to-teal-500" },
  { keys: ["视频", "video", "剪辑", "动画", "anime", "runway", "pika"], icon: Video, gradient: "from-orange-500 to-amber-500" },
  { keys: ["音乐", "audio", "voice", "语音", "suno", "udio"], icon: Music, gradient: "from-fuchsia-500 to-purple-500" },
  { keys: ["设计", "design", "ui", "海报", "logo", "figma", "palette"], icon: Palette, gradient: "from-cyan-500 to-blue-500" },
  { keys: ["写作", "文档", "文章", "文案", "text", "write", "notion", "文档"], icon: FileText, gradient: "from-slate-500 to-zinc-600" },
  { keys: ["翻译", "translate", "语言", "language"], icon: Globe, gradient: "from-sky-500 to-[#4096ff]" },
  { keys: ["知识", "知识库", "rag", "学习", "study", "教育", "brain"], icon: Brain, gradient: "from-amber-500 to-orange-500" },
  { keys: ["办公", "ppt", "表格", "excel", "slide", "会议", "效率"], icon: MessageSquare, gradient: "from-violet-500 to-[#4096ff]" },
];

function getToolIcon(name: string, tags: string[]): { icon: LucideIcon; gradient: string } {
  const text = `${name} ${tags.join(" ")}`.toLowerCase();
  for (const item of TOOL_ICON_MAP) {
    if (item.keys.some((k) => text.includes(k.toLowerCase()))) {
      return { icon: item.icon, gradient: item.gradient };
    }
  }
  return { icon: Wrench, gradient: "from-[#1677ff] to-violet-500" };
}

export function ToolCard({ tool }: { tool: ToolCardData }) {
  const visibleTags = (tool.tags ?? []).slice(0, 2);
  const { icon: ToolIcon, gradient } = getToolIcon(tool.name, tool.tags ?? []);

  return (
    <ContentCard
      href={`/tools/${tool.slug}`}
      icon={
        <CardIcon
          className={`bg-gradient-to-br ${gradient} text-white shadow-sm transition group-hover:shadow-md`}
        >
          <ToolIcon size={22} />
        </CardIcon>
      }
      title={tool.name}
      tags={
        <>
          {visibleTags[0] && <CardTag>{visibleTags[0]}</CardTag>}
          <CardTag>
            <Star size={11} className="text-amber-500" fill="currentColor" />
            {tool.rating}
          </CardTag>
          {visibleTags[1] && <CardTag>{visibleTags[1]}</CardTag>}
        </>
      }
      description={tool.desc}
    />
  );
}

export function PromptCard({
  prompt,
  onDelete,
}: {
  prompt: PromptCardData;
  onDelete?: (slug: string, title: string) => void;
}) {
  return (
    <ContentCard
      href={`/prompts/${prompt.slug}`}
      icon={
        <CardIcon className="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
          <Sparkles size={22} />
        </CardIcon>
      }
      title={prompt.title.trim() || "无标题"}
      tags={
        <>
          <CardTag>{prompt.category}</CardTag>
          <CardTag tone="zinc">
            <Eye size={11} />
            {prompt.uses.toLocaleString()}
          </CardTag>
          {prompt.isNew && (
            <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              NEW
            </span>
          )}
        </>
      }
      description={prompt.desc}
      action={
        onDelete && (
          <button
            type="button"
            title="删除"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(prompt.slug, prompt.title);
            }}
            className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-zinc-400 ring-1 ring-zinc-200 backdrop-blur transition hover:text-rose-600 hover:ring-rose-300 lg:opacity-0 lg:group-hover:opacity-100 dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-zinc-700 dark:hover:text-rose-400"
          >
            <Trash2 size={14} />
          </button>
        )
      }
    />
  );
}

export function PromptImageCard({
  prompt,
  onDelete,
}: {
  prompt: {
    slug: string;
    title: string;
    image: string;
    author: string;
    uses: number;
    content?: string;
    imgWidth?: number;
    imgHeight?: number;
  };
  onDelete?: (slug: string, title: string) => void;
}) {
  const snippet =
    prompt.title?.trim() || "无标题";

  const defaultAspect =
    prompt.imgWidth && prompt.imgHeight
      ? prompt.imgWidth / prompt.imgHeight
      : 1;
  const [aspect, setAspect] = useState(defaultAspect);
  const [loaded, setLoaded] = useState(!!prompt.imgWidth);
  const [failed, setFailed] = useState(false);

  return (
    <Link
      href={`/prompts/${prompt.slug}`}
      className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      {onDelete && (
        <button
          type="button"
          title="删除"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(prompt.slug, prompt.title);
          }}
          className="absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-rose-600 hover:ring-rose-300 dark:bg-zinc-800/90 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:text-rose-400"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div
        className="relative w-full bg-zinc-200 dark:bg-zinc-800"
        style={{ aspectRatio: `${aspect}` }}
      >
        {!failed && (
          <img
            src={prompt.image}
            alt={prompt.title.trim() || "提示词图片"}
            loading="lazy"
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) {
                setAspect(el.naturalWidth / el.naturalHeight);
              }
              setLoaded(true);
            }}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {!loaded && !failed && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
            图片加载失败
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 p-3 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">
          {snippet}
        </h3>
        <p className="mt-0.5 text-xs text-white/70">
          @{prompt.author} · {prompt.uses.toLocaleString()} 次使用
        </p>
      </div>
    </Link>
  );
}

/* ================= 列表卡片统一骨架（与 /mcp 卡片完全同构） ================= */

/** 统一标签 pill：indigo 为默认内容标签，zinc 用于日期/计数等中性元信息 */
export function CardTag({
  children,
  tone = "indigo",
}: {
  children: ReactNode;
  tone?: "indigo" | "zinc";
}) {
  const cls =
    tone === "indigo"
      ? "border-[#1677ff]/30 bg-[#1677ff]/10 text-[#1677ff] dark:border-[#5aa0ff]/20 dark:bg-[#1677ff]/10 dark:text-[#5aa0ff]"
      : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

/** 统一 48px 图标块（卡片头部的 logo/图标容器） */
export function CardIcon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

/** 统一卡片网格（mcp 同款 2/3/4 列响应式） */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

/**
 * 统一内容卡片：头部(48px 图标 + 标题 + 标签 pills) + 3 行截断描述。
 * 整卡可点：用铺满卡片的 stretched link 实现，避免 button 嵌套在 <a> 内；
 * `action` 用于右上角悬浮按钮（自带定位，需自行阻止事件冒泡）。
 * 标签行只保留一行：放不下的 pill 由 fitTags 依传入顺序（即优先级）丢弃。
 */
export function ContentCard({
  href,
  icon,
  title,
  tags,
  description,
  action,
}: {
  href: string;
  icon?: ReactNode;
  title: string;
  tags?: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  const tagsRef = useRef<HTMLDivElement | null>(null);

  // 隐藏一行内放不下的 pill：先全部显示量宽度，超出 clientWidth 的从第一个
  // 溢出项起全部隐藏；首个 pill 单独超宽时保留（由 overflow-hidden 兜底裁剪）。
  useEffect(() => {
    const el = tagsRef.current;
    if (!el) return;
    const GAP = 6; // 与 gap-1.5 保持一致
    const fit = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      kids.forEach((k) => (k.style.display = ""));
      const widths = kids.map((k) => k.offsetWidth);
      const max = el.clientWidth;
      let used = 0;
      kids.forEach((k, i) => {
        used += (i > 0 ? GAP : 0) + widths[i];
        if (used > max && i > 0) k.style.display = "none";
      });
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tags]);

  return (
    <div className="group relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-[#1677ff]/30 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#5aa0ff]/40">
      <Link
        href={href}
        aria-label={title}
        className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#1677ff]"
      />
      {action}
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h3 className="truncate pr-6 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h3>
          {tags && (
            <div
              ref={tagsRef}
              className="mt-1.5 flex flex-nowrap overflow-hidden gap-1.5"
            >
              {tags}
            </div>
          )}
        </div>
      </div>
      {description && (
        <p className="mt-3 line-clamp-3 min-h-[68px] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}
