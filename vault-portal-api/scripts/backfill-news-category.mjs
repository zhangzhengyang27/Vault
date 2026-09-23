/**
 * 存量资讯分类回填：对 category 为 NULL 的行按 news-categories.ts 规则打标。
 * 规则与写入路径（爬虫/后台/种子）完全同源，避免规则漂移。
 *
 * 用法：node scripts/backfill-news-category.mjs [--dry]
 * 依赖 Node 24 原生 TS type stripping 直接导入 src 下的 .ts 规则文件。
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dry = process.argv.includes('--dry');

const envText = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const dbUrlLine = envText
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL'));
if (!dbUrlLine) {
  console.error('.env 中未找到 DATABASE_URL');
  process.exit(1);
}
const DB_URL = dbUrlLine.split('=').slice(1).join('=');

const { classifyNewsCategory } = await import(
  path.join(__dirname, '..', 'src', 'modules', 'news', 'news-categories.ts')
);

const pool = new pg.Pool({ connectionString: DB_URL });
try {
  const { rows } = await pool.query(
    `SELECT id, title, summary, tags, category FROM news WHERE category IS NULL ORDER BY id`,
  );
  console.log(`待回填: ${rows.length} 条`);

  const counts = {};
  let updated = 0;
  for (const row of rows) {
    const key = classifyNewsCategory({
      title: row.title,
      summary: row.summary,
      tags: row.tags,
    });
    counts[key] = (counts[key] ?? 0) + 1;
    if (!dry) {
      await pool.query(`UPDATE news SET category = $1 WHERE id = $2`, [
        key,
        row.id,
      ]);
    }
    updated++;
  }
  console.log(`${dry ? '[dry] ' : ''}已处理 ${updated} 条, 分类分布:`, counts);
} finally {
  await pool.end();
}
