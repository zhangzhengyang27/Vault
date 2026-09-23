#!/usr/bin/env node
/**
 * 「AI 数据库与数据源」知识库对应的工具条目导入。
 * 与 content/ai-databases/ 文档配套：写入 tools 表并带 website 字段，
 * 使文章详情页可通过正文链接主机名自动关联（/api/articles/:slug/related-tools）。
 *
 * 幂等（按 slug upsert），可重复执行。
 * 用法：node scripts/import-ai-db-tools.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// 与「数据与评测」分类关联的条目
const DATA_EVAL = [
  { slug: "arxiv", name: "arXiv", website: "https://arxiv.org/", tags: ["论文", "预印本", "免费"], rating: 4.9, description: "AI 领域几乎所有重要论文的第一发表地，预印本平台，支持分类订阅与免费 API。" },
  { slug: "semantic-scholar", name: "Semantic Scholar", website: "https://www.semanticscholar.org/", tags: ["论文", "学术搜索", "免费"], rating: 4.7, description: "AI2 出品的学术检索引擎，收录 2 亿+ 论文，提供 TLDR 摘要与引用上下文分析。" },
  { slug: "openalex", name: "OpenAlex", website: "https://openalex.org/", tags: ["学术图谱", "开放数据", "免费"], rating: 4.6, description: "完全开放（CC0）的科研大数据图谱，收录约 2.5 亿学术作品，API 免费慷慨，文献计量的首选底座。" },
  { slug: "codesota", name: "CodeSOTA", website: "https://www.codesota.com/", tags: ["评测", "SOTA", "免费"], rating: 4.2, description: "Papers with Code 关站后的社区继任者之一，维护 SOTA 排行榜与基准页面。" },
  { slug: "lmarena", name: "LMArena", website: "https://lmarena.ai/", tags: ["评测", "竞技场", "免费"], rating: 4.8, description: "匿名盲测对战的模型竞技场，用人类偏好投票排出模型座次，覆盖文本、编码、视觉等分类子榜。" },
  { slug: "artificial-analysis", name: "Artificial Analysis", website: "https://artificialanalysis.ai/", tags: ["评测", "比价", "免费"], rating: 4.8, description: "独立评测机构，对 250+ 模型横向对比智能指数、价格与速度，模型选型算性价比的必看一站。" },
  { slug: "helm", name: "HELM", website: "https://crfm.stanford.edu/helm/", tags: ["评测", "学术", "开源"], rating: 4.5, description: "斯坦福 CRFM 的语言模型全维度透明评测框架，覆盖准确性之外的鲁棒性、公平性、毒性等维度，可自行复现。" },
  { slug: "mteb", name: "MTEB Leaderboard", website: "https://huggingface.co/spaces/mteb/leaderboard", tags: ["评测", "Embedding", "免费"], rating: 4.7, description: "嵌入模型的标准评测榜单，RAG 检索选型的唯一权威依据，按任务族与语言分子榜。" },
  { slug: "opencompass", name: "OpenCompass 司南", website: "https://opencompass.org.cn/", tags: ["评测", "中文", "开源"], rating: 4.7, description: "上海 AI 实验室的大模型评测体系，70+ 评测数据集，中英文模型同榜可比，工具链开源可复现。" },
  { slug: "superclue", name: "SuperCLUE", website: "https://www.superclueai.com/", tags: ["评测", "中文", "免费"], rating: 4.5, description: "独立第三方中文大模型测评基准，更新勤、维度细，长期跟踪国内外模型中文能力月度变化。" },
  { slug: "common-crawl", name: "Common Crawl", website: "https://commoncrawl.org/", tags: ["数据集", "语料", "免费"], rating: 4.4, description: "月度抓取 20 亿+ 网页的公益爬虫档案，约 70–90% 的 LLM 训练 token 的上游源头。" },
  { slug: "kaggle", name: "Kaggle", website: "https://www.kaggle.com/", tags: ["数据集", "竞赛", "免费"], rating: 4.8, description: "数据科学竞赛与数据集社区，自带免费 GPU 环境与社区 Notebook，练手最快路径。" },
  { slug: "google-dataset-search", name: "Google Dataset Search", website: "https://datasetsearch.research.google.com/", tags: ["数据集", "搜索", "免费"], rating: 4.3, description: "数据集专用搜索引擎，靠结构化元数据收录全网数据仓库，找长尾领域数据的利器。" },
  { slug: "stanford-ai-index", name: "Stanford AI Index", website: "https://hai.stanford.edu/ai-index", tags: ["报告", "统计", "免费"], rating: 4.9, description: "斯坦福 HAI 年度 AI 行业指数报告，400+ 页数据驱动的全景仪表盘，图表源数据可下载引用。" },
  { slug: "epoch-ai", name: "Epoch AI", website: "https://epoch.ai/", tags: ["统计", "研究", "免费"], rating: 4.6, description: "AI 发展定量研究机构，维护前沿模型数据库与算力/数据趋势曲线，模型级硬数据的第一来源。" },
  { slug: "ai-incident-database", name: "AI Incident Database", website: "https://incidentdatabase.ai/", tags: ["安全", "案例库", "免费"], rating: 4.3, description: "系统收录现实世界 AI 负面事件的开源档案库，做风险评估与合规材料的案例来源。" },
  { slug: "oecd-ai", name: "OECD.AI", website: "https://oecd.ai/", tags: ["政策", "合规", "免费"], rating: 4.2, description: "经合组织的 AI 政策观察站，聚合各国 AI 法规与监管动态，出海合规调研的第一站。" },
  { slug: "acl-anthology", name: "ACL Anthology", website: "https://aclanthology.org/", tags: ["论文", "NLP", "免费"], rating: 4.6, description: "NLP 顶会官方论文档案，收录 ACL/EMNLP 等会议数十年全文，引用正式版而非预印本的标准来源。" },
];

// 与「开发工具」分类关联的条目
const DEV_TOOLS = [
  { slug: "huggingface", name: "Hugging Face", website: "https://huggingface.co/", tags: ["模型库", "开源", "免费"], rating: 4.9, description: "开源 AI 世界的中心枢纽，托管百万级模型、数据集与在线 Demo，配套 transformers 等完整工具链。" },
  { slug: "modelscope", name: "ModelScope 魔搭社区", website: "https://modelscope.cn/", tags: ["模型库", "中文", "免费"], rating: 4.7, description: "中文世界最大的 AI 模型社区（17 万+ 模型），国内下载快、中文生态全，提供免费算力体验与 API 推理。" },
  { slug: "openrouter", name: "OpenRouter", website: "https://openrouter.ai/", tags: ["API", "聚合", "付费"], rating: 4.6, description: "聚合数百个模型的统一 API 网关，一个 key 调用所有主流模型，真实用量榜单反映开发者用脚投票。" },
  { slug: "ollama", name: "Ollama", website: "https://ollama.com/", tags: ["本地部署", "开源", "免费"], rating: 4.7, description: "一条命令在本地跑开源模型的事实标准，OpenAI 兼容 API，支持直接拉取 Hugging Face 的 GGUF 量化模型。" },
];

function loadDatabaseUrl() {
  const envPath = path.join(ROOT, ".env");
  const m = /^DATABASE_URL=(.+)$/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) {
    console.error(".env 中未找到 DATABASE_URL");
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

async function ensureCategory(client, name, slug) {
  const found = await client.query(
    "SELECT id FROM categories WHERE slug = $1 OR name = $2 LIMIT 1",
    [slug, name],
  );
  if (found.rows[0]) return found.rows[0].id;
  const created = await client.query(
    `INSERT INTO categories (name, slug, "sortOrder") VALUES ($1,$2,0) RETURNING id`,
    [name, slug],
  );
  console.log(`+ 分类「${name}」(#${created.rows[0].id})`);
  return created.rows[0].id;
}

async function main() {
  const client = new pg.Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  const dataCatId = await ensureCategory(client, "数据与评测", "data-eval");
  const devCatId = await ensureCategory(client, "开发工具", "dev");

  let created = 0;
  let updated = 0;
  const entries = [
    ...DATA_EVAL.map((t) => ({ ...t, categoryId: dataCatId })),
    ...DEV_TOOLS.map((t) => ({ ...t, categoryId: devCatId })),
  ];

  for (const t of entries) {
    const res = await client.query(
      `INSERT INTO tools
         (slug, name, description, tags, rating, "isFree", "qualityScore", status, phase, website, category_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,true,$5,'published','external',$6,$7,now(),now())
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         tags = EXCLUDED.tags,
         rating = EXCLUDED.rating,
         "qualityScore" = EXCLUDED."qualityScore",
         status = 'published',
         website = EXCLUDED.website,
         category_id = EXCLUDED.category_id,
         updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [
        t.slug,
        t.name,
        t.description,
        t.tags,
        t.rating,
        t.website,
        t.categoryId,
      ],
    );
    res.rows[0].inserted ? created++ : updated++;
    console.log(`${res.rows[0].inserted ? "✓ 新增" : "↻ 更新"} ${t.slug} | ${t.name}`);
  }

  await client.end();
  console.log(`\n===== 工具条目导入完成：新增 ${created}，更新 ${updated} =====`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
