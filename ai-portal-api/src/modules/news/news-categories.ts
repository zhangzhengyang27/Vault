/**
 * 资讯分类规则（从 ai-portal/src/lib/newsMeta.ts 下沉到后端）。
 *
 * news 表的 category 列在写入时由 classifyNewsCategory() 打标（爬虫/后台/种子
 * 全部写入口共用），列表筛选与计数均基于库内值；前端只保留分类的展示元数据。
 *
 * 本文件刻意不依赖 NestJS 装饰器，便于脚本（scripts/ 下回填工具）直接导入复用。
 */

export const NEWS_CATEGORY_KEYS = [
  'models',
  'product',
  'business',
  'research',
  'policy',
  'opensource',
  'industry',
] as const;

export type NewsCategoryKey = (typeof NEWS_CATEGORY_KEYS)[number];

/**
 * 两段式规则（与前端原实现一致）：
 * 1. STRONG_RULES —— 强标识词（金额、法规、机构名等），命中即归该类；
 * 2. WEAK_RULES —— 通用动词/名词兜底。
 * 强规则顺序即优先级：商业动作（融资/收购）比模型名更能决定一条资讯的主题。
 */
const STRONG_RULES: { key: NewsCategoryKey; patterns: RegExp[] }[] = [
  {
    key: 'business',
    patterns: [
      /融资/,
      /收购/,
      /并购/,
      /上市/,
      /估值/,
      /[int]\d+\s*亿美元|\d+\s*亿美元/,
      /\bipo\b/i,
      /营收/,
      /降价|下调.*价格|定价|收费/,
    ],
  },
  {
    key: 'policy',
    patterns: [/监管/, /法案/, /立法/, /合规/, /欧盟/, /政策/, /版权/, /审查/],
  },
  {
    key: 'research',
    patterns: [
      /论文/,
      /\barxiv\b/i,
      /\bneurips\b/i,
      /\bicml\b/i,
      /\biclr\b/i,
      /研究团队/,
      /大学/,
      /学者/,
    ],
  },
  {
    key: 'opensource',
    patterns: [/开源/, /开放权重/, /\bgithub\b/i, /\bapache\b/i, /\bmit\b/i],
  },
  {
    key: 'models',
    patterns: [
      /\bgpt[-\s]?\d/i,
      /\bclaude\b/i,
      /\bgemini\b/i,
      /deepseek/i,
      /\bkimi\b/i,
      /\bllama\b/i,
      /\bqwen\b/i,
      /通义/,
      /混元/,
      /文心/,
      /\bmistral\b/i,
      /\bgrok\b/i,
      /大模型/,
      /旗舰模型/,
    ],
  },
  {
    key: 'product',
    patterns: [
      /发布/,
      /上线/,
      /推出/,
      /公测/,
      /机器人/,
      /手机/,
      /芯片/,
      /浏览器/,
      /\bapp\b/i,
    ],
  },
];

const WEAK_RULES: { key: NewsCategoryKey; patterns: RegExp[] }[] = [
  { key: 'research', patterns: [/研究/, /实验/, /报告/] },
  {
    key: 'models',
    patterns: [/模型/, /多模态/, /推理/, /智能体/, /\bagent\b/i, /\bllm\b/i],
  },
  { key: 'product', patterns: [/版本/, /更新/, /工具/, /功能/] },
  { key: 'business', patterns: [/商业/, /合作/, /市场/, /美元/] },
  { key: 'policy', patterns: [/安全/, /风险/] },
  { key: 'opensource', patterns: [/社区/, /\bweight\b/i] },
];

function matchCategoryKey(text: string): NewsCategoryKey | null {
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

export interface NewsClassifyInput {
  title: string;
  summary?: string | null;
  tags?: string[] | null;
}

/** 按标题/摘要/来源标签推断分类；无命中时归入行业动态（industry） */
export function classifyNewsCategory(
  input: NewsClassifyInput,
): NewsCategoryKey {
  const text = `${input.title} ${input.summary ?? ''} ${(input.tags ?? []).join(' ')}`;
  return matchCategoryKey(text) ?? 'industry';
}
