#!/usr/bin/env node
/**
 * 通用知识库目录导入脚本
 *
 * 用法：
 *   node scripts/import-kb-dir.mjs <contentDir> <kbName>
 *   示例：node scripts/import-kb-dir.mjs content/ai-databases "AI 数据库与数据源"
 *
 * - contentDir 相对于 vault-portal-api 根目录，存放 *.md 源文件（git 版本化）
 * - 每个 .md 文件需带 frontmatter：title / summary / category（必填）
 * - slug = 文件名去掉 .md；文件名字典序即文档展示顺序（列表按 id ASC）
 * - 自动创建缺失的分类（slug = kb-<name 摘要哈希>，避免与现有分类冲突）
 * - 按 slug 幂等 upsert，重复执行只更新内容，不产生重复文章
 * - DATABASE_URL 取自 vault-portal-api/.env
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadDatabaseUrl() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    console.error(`缺少 ${envPath}`);
    process.exit(1);
  }
  const m = /^DATABASE_URL=(.+)$/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) {
    console.error(".env 中未找到 DATABASE_URL");
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

/** 解析 frontmatter 与正文 */
function parseDoc(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const fm = {};
  let body = raw;
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (m) {
    for (const line of m[1].split("\n")) {
      const kv = /^(\w+):\s*(.*)$/.exec(line.trim());
      if (kv) fm[kv[1]] = kv[2].trim();
    }
    body = raw.slice(m[0].length);
  }
  return { fm, body: body.trimStart() };
}

async function main() {
  const [dirArg, kbName] = process.argv.slice(2);
  if (!dirArg || !kbName) {
    console.error("用法: node scripts/import-kb-dir.mjs <contentDir> <kbName>");
    process.exit(1);
  }
  const dir = path.resolve(ROOT, dirArg);
  if (!fs.existsSync(dir)) {
    console.error(`目录不存在: ${dir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  if (files.length === 0) {
    console.error(`目录中没有 .md 文件: ${dir}`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  let created = 0;
  let updated = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const { fm, body } = parseDoc(path.join(dir, file));

    if (!fm.title || !fm.category) {
      console.error(`  ✗ ${file} frontmatter 缺少 title 或 category，跳过`);
      continue;
    }
    const summary =
      fm.summary || body.replace(/[#>*`\-[\]()]/g, "").slice(0, 120);

    // 分类：先按 slug 找，再按名称找，都没有则创建
    const catSlug = `kb-${crypto.createHash("md5").update(fm.category).digest("hex").slice(0, 10)}`;
    let catId = (
      await client.query("SELECT id FROM categories WHERE slug = $1", [catSlug])
    ).rows[0]?.id;
    if (!catId) {
      catId = (
        await client.query("SELECT id FROM categories WHERE name = $1 LIMIT 1", [
          fm.category,
        ])
      ).rows[0]?.id;
    }
    if (!catId) {
      catId = (
        await client.query(
          `INSERT INTO categories (name, slug, "sortOrder") VALUES ($1, $2, $3) RETURNING id`,
          [fm.category, catSlug, Number(fm.sort) || 0],
        )
      ).rows[0].id;
      console.log(`  + 分类「${fm.category}」(#${catId})`);
    }

    const res = await client.query(
      `INSERT INTO articles
         (slug, title, summary, content, status, phase, "publishedAt", knowledge_base, category_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'published','external',now(),$5,$6,now(),now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         content = EXCLUDED.content,
         status = 'published',
         knowledge_base = EXCLUDED.knowledge_base,
         category_id = EXCLUDED.category_id,
         updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [slug, fm.title, summary, body, kbName, catId],
    );
    res.rows[0].inserted ? created++ : updated++;
    console.log(
      `  ${res.rows[0].inserted ? "✓ 新增" : "↻ 更新"} ${slug} | ${fm.title}`,
    );
  }

  await client.end();
  console.log(
    `\n===== 知识库「${kbName}」导入完成：新增 ${created} 篇，更新 ${updated} 篇 =====`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
