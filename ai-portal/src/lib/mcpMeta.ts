/**
 * MCP / Skills 分类推断工具。
 * 后端数据无 category 字段，这里基于 slug / name / description 关键词自动归类，
 * 并输出分类的配色与图标名，供列表页与详情页复用。
 */

export interface McpCategoryMeta {
  key: string;
  label: string;
  /** tailwind 图标名（lucide-react） */
  icon: string;
  /** 卡片图标底色 */
  chip: string;
  /** 分类 tab / 标签配色 */
  tag: string;
}

export const MCP_CATEGORIES: McpCategoryMeta[] = [
  {
    key: "dev",
    label: "开发工具",
    icon: "Wrench",
    chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    tag: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  {
    key: "search",
    label: "搜索与抓取",
    icon: "Search",
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    tag: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  {
    key: "database",
    label: "数据库",
    icon: "Database",
    chip: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    tag: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  },
  {
    key: "browser",
    label: "浏览器自动化",
    icon: "Globe",
    chip: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    tag: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  },
  {
    key: "knowledge",
    label: "知识管理",
    icon: "BookOpen",
    chip: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    tag: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
  {
    key: "collab",
    label: "协作与通信",
    icon: "MessageSquare",
    chip: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
    tag: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
  },
  {
    key: "files",
    label: "文件与存储",
    icon: "Folder",
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    tag: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    key: "ai",
    label: "AI 效率",
    icon: "Sparkles",
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    tag: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    key: "research",
    label: "研究与数据",
    icon: "FlaskConical",
    chip: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
    tag: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  },
  {
    key: "cloud",
    label: "云平台与基建",
    icon: "Cloud",
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    tag: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    key: "life",
    label: "生活与工具",
    icon: "MapPin",
    chip: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400",
    tag: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400",
  },
  {
    key: "media",
    label: "多媒体",
    icon: "Clapperboard",
    chip: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
    tag: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
  },
];

const FALLBACK: McpCategoryMeta = {
  key: "other",
  label: "其他",
  icon: "Plug",
  chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  tag: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

interface Rule {
  key: string;
  /** 强标识：具体产品/工具名，命中即归该类（优先于弱通用词） */
  patterns: RegExp[];
}

/**
 * 两段式规则：
 * 1. STRONG_RULES —— 强标识（产品名、专有名词），先匹配；
 * 2. WEAK_RULES —— 通用词兜底。
 * 避免 GitHub 链接命中 /git/ 把地图、生活类工具误归为「开发工具」。
 */
const STRONG_RULES: Rule[] = [
  {
    key: "knowledge",
    patterns: [/notion/i, /知识库/i, /知识图谱/i, /文档/i, /cognee/i],
  },
  {
    key: "collab",
    patterns: [/slack/i, /协作/i, /通信/i, /频道/i, /消息/i, /微信/i],
  },
  {
    key: "life",
    patterns: [/amap/i, /高德/i, /百度地图/i, /baidu[\s-]?map/i, /菜谱/i, /食谱/i],
  },
  {
    key: "media",
    patterns: [
      /minimax/i,
      /视频/i,
      /语音/i,
      /图生/i,
      /生成.*图/i,
      /clapper/i,
      /everart/i,
    ],
  },
  {
    key: "browser",
    patterns: [
      /playwright/i,
      /chrome/i,
      /browserbase/i,
      /browser/i,
      /devtools/i,
      /浏览器/i,
      /网页自动化/i,
    ],
  },
  {
    key: "database",
    patterns: [
      /database/i,
      /redis/i,
      /postgres/i,
      /mysql/i,
      /mongodb/i,
      /qdrant/i,
      /\bsql\b/i,
      /数据库/i,
      /perfetto/i,
    ],
  },
  {
    key: "research",
    patterns: [
      /arxiv/i,
      /researcher/i,
      /research/i,
      /financial/i,
      /finance/i,
      /金融/i,
      /论文/i,
      /研究/i,
      /股票/i,
      /数据集/i,
      /akshare/i,
      /qmt/i,
      /futu/i,
      /行情/i,
      /K线/i,
    ],
  },
  {
    key: "cloud",
    patterns: [
      /cloudflare/i,
      /\baws\b/i,
      /edgeone/i,
      /云平台/i,
      /workers/i,
      /基础设施/i,
    ],
  },
  {
    key: "dev",
    patterns: [
      /gitlab/i,
      /github/i,
      /\bgit\b/i,
      /codebase/i,
      /terraform/i,
      /kubernetes/i,
      /k8s/i,
      /context7/i,
      /serena/i,
      /codegraph/i,
      /solidworks/i,
      /figma/i,
      /xcode/i,
      /godot/i,
      /unity/i,
      /freecad/i,
      /fusion 360/i,
      /tauri/i,
      /unreal/i,
      /kicad/i,
      /mermaid/i,
      /element-plus/i,
      /spring.?boot/i,
      /mcp.?server.?solidworks/i,
    ],
  },
  {
    key: "files",
    patterns: [/filesystem/i, /文件/i, /存储/i, /读写/i],
  },
];

const WEAK_RULES: Rule[] = [
  { key: "search", patterns: [/search/i, /firecrawl/i, /\bexa\b/i, /brave/i, /fetch/i, /crawl/i, /抓取/i, /检索/i, /搜索/i, /秘塔/i, /metaso/i, /web-to-mcp/i, /爬虫/i] },
  { key: "database", patterns: [/数据库/i, /\bsql\b/i, /查询/i] },
  { key: "dev", patterns: [/代码/i, /开发/i, /调试/i, /编程/i, /cli/i, /api/i, /构建/i, /部署/i, /\bdev\b/i, /\bcode\b/i] },
  { key: "browser", patterns: [/浏览器/i, /网页/i] },
  { key: "knowledge", patterns: [/知识/i, /文档/i, /记忆/i, /笔记/i, /\bdoc\b/i] },
  { key: "collab", patterns: [/协作/i, /通信/i, /消息/i, /频道/i] },
  { key: "files", patterns: [/文件/i, /存储/i, /读写/i] },
  { key: "cloud", patterns: [/云/i, /部署/i, /deploy/i] },
  { key: "life", patterns: [/生活/i, /地图/i, /位置/i] },
  { key: "media", patterns: [/图/i, /视频/i, /语音/i, /音频/i, /chart/i, /visual/i] },
  { key: "research", patterns: [/研究/i, /数据/i, /分析/i, /报表/i] },
  { key: "ai", patterns: [/thinking/i, /\btime\b/i, /everything/i, /modelcontextprotocol/i, /\bmcp\b/i, /\bllm\b/i, /\bai\b/i, /agent/i, /智能体/i, /思维/i, /思考/i, /自动化/i] },
];

function matchKey(text: string): string | null {
  for (const rule of STRONG_RULES) {
    for (const p of rule.patterns) {
      if (p.test(text)) return rule.key;
    }
  }
  for (const rule of WEAK_RULES) {
    for (const p of rule.patterns) {
      if (p.test(text)) return rule.key;
    }
  }
  return null;
}

export interface McpLike {
  slug: string;
  name: string;
  description?: string;
  endpoint?: string;
}

export function inferCategory(m: McpLike): McpCategoryMeta {
  // endpoint 多为 github.com 链接，剥离 URL 前缀避免干扰分类
  const cleanEndpoint = (m.endpoint ?? "").replace(
    /^(https?:\/\/)?(www\.)?github\.com\//i,
    "",
  );
  const text = `${m.slug} ${m.name} ${m.description ?? ""} ${cleanEndpoint}`;
  const key = matchKey(text);
  return (
    MCP_CATEGORIES.find((c) => c.key === key) ??
    FALLBACK
  );
}

export function getCategoryByKey(key: string): McpCategoryMeta {
  return MCP_CATEGORIES.find((c) => c.key === key) ?? FALLBACK;
}

/** 从名称或 slug 中提取品牌/产品短名，用于卡片标签展示 */
function extractBrandTag(m: McpLike): string {
  if (m.name) {
    const brand = m.name.split(/ MCP| Server|服务器| \(|\//i)[0].trim();
    if (brand) return brand;
  }
  const fromSlug = (m.slug || "")
    .replace(/-mcp$/, "")
    .replace(/-/g, " ")
    .trim();
  return fromSlug
    ? fromSlug.replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
}

/**
 * 生成卡片标签。后端 tags 为空，这里基于分类 + 品牌名自动补全，
 * 样式参考 ai.codefather.cn/mcp 的蓝色小药丸标签。
 */
export function getMcpTags(m: McpLike): string[] {
  const cat = inferCategory(m);
  const brand = extractBrandTag(m);
  const tags = [cat.label];
  if (
    brand &&
    brand.toLowerCase() !== cat.label.toLowerCase() &&
    brand.length <= 18
  ) {
    tags.push(brand);
  }
  return tags.slice(0, 2);
}
