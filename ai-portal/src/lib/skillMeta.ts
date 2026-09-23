/**
 * Agent Skills 分类元数据。
 * 技能分类标签来自种子数据的 tags 字段（参照 ai.codefather.cn/skills 分类体系），
 * 这里为每个分类提供配色与图标，供 Skills 列表页与详情页复用。
 */

export interface SkillCategoryMeta {
  key: string;
  label: string;
  /** 卡片图标底色 */
  chip: string;
  /** 分类 tab / 标签配色 */
  tag: string;
}

export const SKILL_CATEGORIES: SkillCategoryMeta[] = [
  {
    key: "效率工具",
    label: "效率工具",
    chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    tag: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  {
    key: "软件开发",
    label: "软件开发",
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    tag: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  {
    key: "数据与分析",
    label: "数据与分析",
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    tag: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    key: "文档处理",
    label: "文档处理",
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    tag: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    key: "内容与媒体",
    label: "内容与媒体",
    chip: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
    tag: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
  },
  {
    key: "商业与营销",
    label: "商业与营销",
    chip: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    tag: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  },
  {
    key: "测试与安全",
    label: "测试与安全",
    chip: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    tag: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
  {
    key: "Claude 官方",
    label: "Claude 官方",
    chip: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    tag: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  },
];

const FALLBACK: SkillCategoryMeta = {
  key: "其他",
  label: "其他",
  chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  tag: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export function getSkillCategoryByKey(key: string): SkillCategoryMeta {
  return (
    SKILL_CATEGORIES.find((c) => c.key === key) ??
    FALLBACK
  );
}

export interface SkillLike {
  slug: string;
  name: string;
  description?: string;
  endpoint?: string;
  tags?: string[];
}
