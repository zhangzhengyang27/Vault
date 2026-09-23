/**
 * AI 资讯分类展示元数据 + 关键词工具。
 *
 * 分类的判定规则已下沉到后端（ai-portal-api/src/modules/news/news-categories.ts），
 * 在资讯写入时打标并存储于 news.category 列；列表筛选与计数均基于库内值。
 * 本文件只保留「key → 中文标签/配色」的展示映射与相关资讯的关键词提取。
 */

export interface NewsCategoryMeta {
  key: string;
  label: string;
  /** chip / 标签配色 */
  tag: string;
}

export const NEWS_CATEGORIES: NewsCategoryMeta[] = [
  {
    key: "models",
    label: "大模型",
    tag: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  {
    key: "product",
    label: "产品发布",
    tag: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  {
    key: "business",
    label: "融资与商业",
    tag: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    key: "research",
    label: "学术研究",
    tag: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
  {
    key: "policy",
    label: "政策监管",
    tag: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    key: "opensource",
    label: "开源动态",
    tag: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  },
];

const FALLBACK: NewsCategoryMeta = {
  key: "industry",
  label: "行业动态",
  tag: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export function getNewsCategoryByKey(key: string): NewsCategoryMeta {
  return NEWS_CATEGORIES.find((c) => c.key === key) ?? FALLBACK;
}

/** 与分类无关的常见词，相关资讯匹配时剔除 */
const KEYWORD_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "new",
  "ai",
  "open",
  "pro",
  "max",
  "app",
  "全球",
  "发布",
  "推出",
  "正式",
]);

/**
 * 从标题提取匹配关键词：拉丁词（含 DeepSeek-V4-Pro 这类连词再拆分）
 * + 中文双字组，用于相关资讯的相似度打分。
 */
export function extractNewsKeywords(title: string): string[] {
  const lower = title.toLowerCase();
  const words = (lower.match(/[a-z][a-z0-9.+-]*/g) ?? [])
    .flatMap((w) => w.split(/[-.+/]/))
    .filter((w) => w.length >= 2 && !KEYWORD_STOPWORDS.has(w));
  const cjkRuns = lower.match(/[\u4e00-\u9fff]+/g) ?? [];
  const bigrams: string[] = [];
  for (const run of cjkRuns) {
    for (let i = 0; i + 2 <= run.length; i++) {
      const g = run.slice(i, i + 2);
      if (!KEYWORD_STOPWORDS.has(g)) bigrams.push(g);
    }
  }
  return [...new Set([...words, ...bigrams])];
}
