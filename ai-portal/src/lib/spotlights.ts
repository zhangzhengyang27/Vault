/**
 * 行业场景专题页配置。
 * 每个专题的 tools/prompts/mcps 为人工策划的 slug 清单（详情页按 slug 拉取
 * 真实数据渲染），搜索结果仅作为"更多相关"补充。
 * 策划原则：优先场景标志性工具（部分经网络调研新增入库），提示词选场景
 * 强相关的精品，MCP 选能实际增强该场景工作流的组件。
 */

export interface SpotlightItem {
  slug: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  /** 关联的工具 slug 列表 */
  tools: string[];
  /** 关联的提示词 slug 列表 */
  prompts: string[];
  /** 关联的 MCP slug 列表 */
  mcps: string[];
  /** 专题介绍文案 */
  intro: string;
}

export const SPOTLIGHTS: SpotlightItem[] = [
  {
    slug: "product-manager",
    title: "产品经理工具箱",
    description: "需求分析、用户研究、原型设计、文档协作全流程 AI 工具",
    icon: "📋",
    gradient: "from-blue-500 to-indigo-600",
    tools: [
      "chatprd",
      "figma",
      "miro",
      "whimsical",
      "linear",
      "dovetail",
      "gamma",
      "otter-ai",
    ],
    prompts: [
      "prd-template",
      "product-naming",
      "competitor-analysis",
      "survey-designer",
      "decision-framework",
    ],
    mcps: [
      "notion-mcp-server",
      "mcp-mermaid",
      "xmind-generator-mcp-server",
      "framelink-figma-mcp-server",
    ],
    intro:
      "从需求挖掘到产品上线，产品经理的每个环节都有 AI 可以提效。本专题精选了需求分析、用户访谈、竞品调研、PRD 撰写、原型设计等场景的最佳工具和提示词。",
  },
  {
    slug: "indie-developer",
    title: "独立开发者全套",
    description: "一人公司技术栈：代码、设计、部署、运营、客服",
    icon: "🚀",
    gradient: "from-emerald-500 to-teal-600",
    tools: [
      "cursor",
      "v0",
      "lovable",
      "bolt",
      "replit",
      "vercel",
      "supabase",
    ],
    prompts: [
      "code-review",
      "code-refactor",
      "code-optimizer",
      "security-audit",
    ],
    mcps: [
      "github-mcp-server",
      "context7",
      "serena",
      "playwright-mcp",
      "postgres-mcp",
    ],
    intro:
      "独立开发者需要一人分饰多角。本专题聚合了代码生成、UI 设计、部署运维、用户增长、客服自动化等全链路工具，帮你用最少的资源做出完整产品。",
  },
  {
    slug: "content-creator",
    title: "自媒体创作套件",
    description: "文案、配图、视频、剪辑、分发一站式内容生产",
    icon: "✍️",
    gradient: "from-rose-500 to-pink-600",
    tools: [
      "jianying",
      "opus-clip",
      "canva",
      "sora",
      "kling",
      "midjourney",
      "heygen",
    ],
    prompts: [
      "xiaohongshu-copy",
      "headline-generator",
      "cb13-marketing-content",
      "paint-015",
    ],
    mcps: [
      "firecrawl-mcp",
      "exa-mcp",
      "brave-search",
      "generate-images-mcp-server",
    ],
    intro:
      "内容创作者的效率引擎。从选题策划、文案撰写、封面设计到视频剪辑和多平台分发，每个环节都有对应的 AI 工具和提示词模板。",
  },
  {
    slug: "data-analyst",
    title: "数据分析师工作台",
    description: "数据采集、清洗、分析、可视化、报告生成",
    icon: "📊",
    gradient: "from-amber-500 to-orange-600",
    tools: [
      "julius-ai",
      "hex",
      "microsoft-365-copilot",
      "kaggle",
      "notebooklm",
    ],
    prompts: [
      "sql-query-helper",
      "data-analysis-report",
      "data-viz-advisor",
      "log-analyzer",
    ],
    mcps: [
      "postgres-mcp",
      "mysql-mcp",
      "mcp-toolbox-for-databases",
      "dbhub",
    ],
    intro:
      "用 AI 加速数据分析全流程。从 SQL 生成、数据清洗、统计分析到可视化图表和报告撰写，让你从取数工升级为业务分析师。",
  },
  {
    slug: "student-researcher",
    title: "学生与研究者",
    description: "文献检索、论文写作、学术翻译、知识管理",
    icon: "🎓",
    gradient: "from-violet-500 to-purple-600",
    tools: [
      "zotero",
      "elicit",
      "consensus",
      "deepl",
      "notebooklm",
      "arxiv",
      "semantic-scholar",
      "liner",
    ],
    prompts: [
      "paper-abstract",
      "oss-003",
      "book-summarizer",
      "flashcard-generator",
    ],
    mcps: [
      "arxiv-mcp",
      "gpt-researcher",
      "tavily-mcp-server",
      "fetch-mcp",
    ],
    intro:
      "学术研究的 AI 助手。覆盖文献检索与综述、论文结构与润色、学术翻译、公式推导、知识管理等场景，助力高效科研。",
  },
  {
    slug: "marketer",
    title: "营销增长专家",
    description: "SEO、广告文案、社媒运营、用户增长、数据分析",
    icon: "📈",
    gradient: "from-cyan-500 to-blue-600",
    tools: [
      "semrush",
      "ahrefs",
      "jasper",
      "canva",
      "nano-ai",
    ],
    prompts: [
      "seo-meta-writer",
      "cb13-marketing-content",
      "oss-012",
      "xiaohongshu-copy",
    ],
    mcps: [
      "firecrawl-mcp",
      "exa-mcp",
      "tavily-mcp-server",
      "baidu-search-mcp-server",
    ],
    intro:
      "营销人的 AI 增长武器。从 SEO 优化、广告文案、社媒内容到用户增长策略和效果分析，用 AI 驱动每一次营销决策。",
  },
  {
    slug: "designer",
    title: "设计师灵感库",
    description: "UI/UX、插画、海报、3D、动效设计工具集合",
    icon: "🎨",
    gradient: "from-fuchsia-500 to-pink-600",
    tools: [
      "figma",
      "midjourney",
      "recraft",
      "ideogram",
      "leonardo-ai",
      "flux",
      "uizard",
      "canva",
    ],
    prompts: [
      "tbox-007",
      "tboxf-0062",
      "paint-015",
      "tboxf-0017",
    ],
    mcps: [
      "framelink-figma-mcp-server",
      "figma-to-vue-mcp-server",
      "generate-images-mcp-server",
      "flux-image-generation-server",
      "gemini-image-generation-mcp",
    ],
    intro:
      "设计师的 AI 创意伙伴。从 UI 设计、插画生成、海报排版到 3D 建模和动效设计，激发灵感并提升产出效率。",
  },
  {
    slug: "devops-engineer",
    title: "DevOps 运维指南",
    description: "CI/CD、监控、日志、安全、云原生工具链",
    icon: "⚙️",
    gradient: "from-slate-600 to-zinc-700",
    tools: [
      "docker",
      "grafana",
      "datadog",
      "postman",
      "cursor",
    ],
    prompts: [
      "dockerfile-generator",
      "dev-linux-ops",
      "dev-docker-expert",
      "oss-002",
    ],
    mcps: [
      "kubernetes-mcp",
      "cloudflare-mcp",
      "prometheus-mcp-server",
      "sentry-selfhosted-mcp",
      "aws-mcp-servers",
    ],
    intro:
      "DevOps 工程师的 AI 工具箱。覆盖 CI/CD 流水线、基础设施即代码、监控告警、日志分析、安全扫描和云原生运维等场景。",
  },
];

export function getSpotlight(slug: string): SpotlightItem | undefined {
  return SPOTLIGHTS.find((s) => s.slug === slug);
}
