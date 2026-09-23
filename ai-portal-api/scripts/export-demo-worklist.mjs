#!/usr/bin/env node
// 导出「网页生成」分类提示词为演示页生成的工作清单 JSON
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const env = fs.readFileSync(path.join(import.meta.dirname, "..", ".env"), "utf8");
const DATABASE_URL = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const { rows } = await client.query(`
  SELECT p.slug, p.title, p."optimizedContent" AS content
  FROM prompts p JOIN categories c ON c.id = p.category_id
  WHERE p.kind='precise' AND c.slug='prompt-web' AND p.status='published'
  ORDER BY p.id`);
await client.end();
const out = path.join(import.meta.dirname, "demo-worklist.json");
fs.writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(`exported ${rows.length} rows -> ${out}`);
