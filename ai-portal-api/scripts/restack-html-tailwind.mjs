#!/usr/bin/env node
/**
 * 一次性迁移：把「网页生成」类提示词的交付技术栈从 React+Vite+Tailwind
 * 统一改为 HTML + Tailwind CSS（单文件、零构建）。
 *
 * 原则：
 * - 只改「肯定式指令」（要求使用 React/Vite/Next.js 的地方）；
 *   「无需 npm / Vite」「不使用 React / Vue」等否定句保持原样。
 * - 先把受影响行备份到 prompts_backup_stack 表，可随时还原。
 * - 用法：node scripts/restack-html-tailwind.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry");

// 手动解析 ai-portal-api/.env 的 DATABASE_URL
const envPath = path.join(__dirname, "..", ".env");
const env = fs.readFileSync(envPath, "utf8");
const DATABASE_URL = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!DATABASE_URL) {
  console.error("未在 .env 中找到 DATABASE_URL");
  process.exit(1);
}

/**
 * 有序替换规则 [正则, 替换文本, 说明]。
 * 只命中肯定式技术栈指令；否定句（无需/不使用）不会被这些模式匹配。
 */
const RULES = [
  // 描述里的旧技术栈署名（含各种空格写法）
  [/React\s*\+\s*Vite\s*\+\s*Tailwind(\s*CSS)?/gi, "HTML + Tailwind CSS", "React+Vite+Tailwind 组合"],
  [/React\+Vite\+Tailwind(?:CSS)?/gi, "HTML + Tailwind CSS", "React+Vite+Tailwind 紧凑写法"],
  // 角色设定里的能力描述
  [/转化为像素级的 React\/Tailwind 代码/g, "转化为像素级的 HTML + Tailwind CSS 代码", "0316 角色技能"],
  [/擅长 React、Tailwind CSS 和 Canvas 图形处理/g, "擅长 HTML、Tailwind CSS 和 Canvas 图形处理", "0348 角色技能"],
  // 0315 JARVIS HUD
  [/精通 WebGL \(Three\.js\/react-three-fiber\)/g, "精通 WebGL (Three.js，CDN 引入)", "0315 WebGL 技能"],
  [/\*\*技术栈专长:\*\* React \+ TypeScript \+ Vite、@react-three\/drei、@mediapipe\/tasks-vision、Tailwindcss/gi,
    "**技术栈专长:** HTML + Tailwind CSS、Three.js（CDN 引入）、@mediapipe/tasks-vision", "0315 技术栈"],
  [/开发单文件 React 应用/g, "开发单文件 HTML 应用", "0315 任务目标"],
  // 0306 / 0307 任务指令
  [/使用 React \(Next\.js\) 和 Tailwind CSS 开发/g, "使用 HTML + Tailwind CSS 开发", "0306 任务"],
  [/请使用\s*React \+ TypeScript\s*创建/g, "请使用 HTML + Tailwind CSS + 原生 JavaScript 创建", "0307 任务"],
  // 0332 英文技术栈清单
  [/- \*\*Framework\*\*: Next\.js 14 \(App Router\) or React \(Vite\)\./g,
    "- **Framework**: None — single-file HTML, open directly in the browser, no build step.", "0332 Framework"],
  [/- \*\*Animation\*\*: Framer Motion \(for shared layout animations, hover states, and spotlights\)\./g,
    "- **Animation**: CSS transitions/keyframes + IntersectionObserver (no npm dependencies).", "0332 Animation"],
  [/- \*\*Icons\*\*: Lucide React\./g, "- **Icons**: inline SVG (Lucide icon paths).", "0332 Icons"],
  [/`Icon` \(use Lucide-react\)/g, "`Icon` (use inline SVG, Lucide icon paths)", "0332 图标说明"],
  // 0316 结尾指令
  [/完整 React 代码。/g, "完整单文件 HTML + Tailwind CSS 代码。", "0316 结尾指令"],
  // wsp 系列的「关键依赖」npm 包清单：与单文件 HTML 方案矛盾，整体替换为 CDN 方案。
  // 非贪婪匹配到 json 代码块的闭合 ```；用函数替换避免 $ 转义问题
  [/(##\s*\d+\.\s*关键依赖\s*```json)[\s\S]*?(```)/g,
    (_m, head, tail) =>
      `${head}\n{ "Tailwind CSS": "Play CDN（<script src=\\"https://cdn.tailwindcss.com\\"></script>）", "动画": "CSS @keyframes + IntersectionObserver（原生 JavaScript）", "图标": "内联 SVG", "字体": "Fontsource + jsDelivr CDN / 系统字体栈" }\n${tail}`,
    "关键依赖 npm 清单 → CDN 方案"],
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// 受影响行：precise 且四个文本字段任一含 vite/react 肯定式线索。
// 只做候选圈定，真正是否修改由规则命中决定，未命中的行原样跳过。
const { rows } = await client.query(`
  SELECT id, slug, title, description, content, "optimizedContent"
  FROM prompts
  WHERE kind = 'precise'
    AND (content ILIKE '%vite%' OR description ILIKE '%vite%'
         OR content ILIKE '%react%' OR description ILIKE '%react%'
         OR "optimizedContent" ILIKE '%react%' OR "optimizedContent" ILIKE '%vite%')
`);

console.log(`候选行：${rows.length}`);

if (!DRY) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS prompts_backup_stack AS
    SELECT * FROM prompts WITH NO DATA
  `);
  // 备份表只保留一版：若已有同 slug 备份则跳过（NOT EXISTS）
  await client.query(`
    INSERT INTO prompts_backup_stack
    SELECT p.* FROM prompts p
    WHERE p.id IN (${rows.map((r) => r.id).join(",")})
      AND NOT EXISTS (SELECT 1 FROM prompts_backup_stack b WHERE b.slug = p.slug)
  `);
}

let changedRows = 0;
let changedFields = 0;

for (const row of rows) {
  const updates = {};
  for (const field of ["description", "content", "optimizedContent"]) {
    let text = row[field];
    if (!text) continue;
    const before = text;
    for (const [re, rep, note] of RULES) {
      text = text.replace(re, rep);
    }
    if (text !== before) {
      updates[field] = text;
    }
  }
  if (Object.keys(updates).length === 0) continue;

  changedRows += 1;
  changedFields += Object.keys(updates).length;
  console.log(`✎ ${row.slug}: ${Object.keys(updates).join(", ")}`);
  if (!DRY) {
    const sets = Object.keys(updates)
      .map((f, i) => `"${f}" = $${i + 1}`)
      .join(", ");
    await client.query(
      `UPDATE prompts SET ${sets} WHERE id = $${Object.keys(updates).length + 1}`,
      [...Object.values(updates), row.id],
    );
  }
}

console.log(`\n${DRY ? "[dry-run] " : ""}变更 ${changedRows} 行 / ${changedFields} 个字段`);
await client.end();
