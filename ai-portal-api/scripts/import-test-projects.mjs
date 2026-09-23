#!/usr/bin/env node
/**
 * 将 /Users/xiaoye/Desktop/test 中的 16 个 AI 生成网页项目
 * 整理进「网页生成提示词」分类:
 * - 每个项目一条 prompt(内容 = 完整生成提示词,9 个来自项目自带 PROMPT.md,
 *   7 个由成品反向整理,见 scripts/test-prompts/*.md)
 * - 演示文件已复制到 ai-portal/public/demos/,写入 link 附件点亮「访问演示」
 * 幂等:slug 已存在则跳过。
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const TEST_ROOT = "/Users/xiaoye/Desktop/test";
const REVERSE_DIR = path.join(import.meta.dirname, "test-prompts");

const env = fs.readFileSync(path.join(import.meta.dirname, "..", ".env"), "utf8");
const DATABASE_URL = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();

const PROJECTS = [
  { slug: "pixel-snake", title: "像素贪吃蛇 · Pixel Snake(复古 CRT 风)", promptFile: path.join(TEST_ROOT, "pixel-snake/PROMPT.md"), desc: "复古像素风网页贪吃蛇游戏:键盘与触屏双操作、可持久化积分榜,单文件即开即玩。", demo: "/demos/pixel-snake.html" },
  { slug: "grammar-game", title: "暑期旅行语法闯关 · 现在完成时 already/yet", promptFile: path.join(TEST_ROOT, "grammar-game/语法闯关-生成提示词.md"), desc: "把英语语法练习做成旅行剧情闯关游戏:already/yet 现在完成时,答错有讲解,单文件可玩。", demo: "/demos/grammar-game.html" },
  { slug: "meow-food", title: "喵食光 · 宠物鲜食预售落地页", promptFile: path.join(TEST_ROOT, "meow-food/落地页生成提示词.md"), desc: "温暖治愈风的猫用鲜食预售落地页:信任建立 → 试吃计划 → 订阅转化的完整链路。", demo: "/demos/meow-food.html" },
  { slug: "meiduan-daily", title: "美短日报 · 复古报刊编辑部", promptFile: path.join(TEST_ROOT, "meiduan-daily/PROMPT.md"), desc: "把美短猫的日常排成复古报纸:报刊编辑部级排版、栏目与趣闻,单页创意内容站。", demo: "/demos/meiduan-daily.html" },
  { slug: "shanghai-devcon-2026", title: "上海开发者大会 2026 · 官网", promptFile: path.join(TEST_ROOT, "shanghai-devcon-2026/PROMPT.md"), desc: "开发者大会营销官网:日程、讲者、票务与 FAQ,多区块长页,含本地图库。", demo: "/demos/shanghai-devcon-2026/index.html" },
  { slug: "time-pup-workbench", title: "汪汪日程报 · 未来时间管理局", promptFile: path.join(TEST_ROOT, "time-pup-workbench/PROMPT.md"), desc: "拟人化小狗主题的时间管理工作台:日程、专注与打卡,科幻管理局世界观。", demo: "/demos/time-pup-workbench.html" },
  { slug: "warm-companion", title: "温暖陪伴 · 阿澈情感聊天原型", promptFile: path.join(TEST_ROOT, "warm-companion/project-prompt.md"), desc: "治愈系 AI 陪伴聊天界面原型:暖男学长「阿澈」,情绪识别式回复与场景化对话。", demo: "/demos/warm-companion.html" },
  { slug: "gamedev-portfolio", title: "PR0TO·DEV — 独立游戏开发者作品集", promptFile: path.join(TEST_ROOT, "gamedev-portfolio/生成提示词.md"), desc: "独立游戏开发者的暗色作品集站:项目展示、技术栈与联系区,HTML/CSS/JS 多文件。", demo: "/demos/gamedev-portfolio/index.html" },
  { slug: "photographer-portfolio", title: "筑光 ZHU·GUANG — 建筑摄影师作品集", promptFile: path.join(TEST_ROOT, "photographer-portfolio/prompts.md"), desc: "建筑摄影师作品集:整版摄影网格、项目详情与关于页,自托管图片与字体。", demo: "/demos/photographer-portfolio/index.html" },
  { slug: "dunhuang-course", title: "敦煌艺术与丝路文明 · 沉浸式数字课程门户", promptFile: path.join(REVERSE_DIR, "dunhuang-course.md"), desc: "八讲敦煌主题数字课程门户:章节阅读、壁画画廊、丝路地图与归档,多页静态站。", demo: "/demos/dunhuang-course/index.html" },
  { slug: "big-fish-eat-small-fish", title: "大鱼吃小鱼 · Feeding Frenzy", promptFile: path.join(REVERSE_DIR, "big-fish-eat-small-fish.md"), desc: "深海 Canvas 休闲游戏:吞吃成长、体型谱系判定,鼠标/触屏/键盘三操控。", demo: "/demos/big-fish-eat-small-fish.html" },
  { slug: "dagongren-ledger", title: "打工人小账本", promptFile: path.join(REVERSE_DIR, "dagongren-ledger.md"), desc: "可爱治愈风记账工具:10 秒记一笔、存款曲线与「真实时薪」计算器,localStorage 持久化。", demo: "/demos/dagongren-ledger.html" },
  { slug: "salary-calculator", title: "实时薪资计算器", promptFile: path.join(REVERSE_DIR, "salary-calculator.md"), desc: "极简效率工具:输入年薪与工作制度,实时看每秒进账与下班倒计时。", demo: "/demos/salary-calculator.html" },
  { slug: "learn-goals", title: "学习目标管理台", promptFile: path.join(REVERSE_DIR, "learn-goals.md"), desc: "学习目标 CRUD 与按日打卡管理台:连续天数、进度日历,localStorage 持久化。", demo: "/demos/learn-goals.html" },
  { slug: "ai-daily-2026-08-16", title: "AI 精选仪表盘 · 周报(08-11 ~ 08-16)", promptFile: path.join(REVERSE_DIR, "ai-daily-2026-08-16.md"), desc: "一周 AI 要闻聚合仪表盘:按来源分组、外链安全过滤,信息密度与克制版面并存。", demo: "/demos/ai-daily-2026-08-16.html" },
  { slug: "hdi-beyond-gdp", title: "GDP 之外:用 HDI 重新丈量发展", promptFile: path.join(REVERSE_DIR, "hdi-beyond-gdp.md"), desc: "深空星图风数据新闻:HDI × 人均 GNI 散点、30 国排行与反差洞察,UNDP 真实数据。", demo: "/demos/hdi-beyond-gdp.html" },
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows: catRows } = await client.query(
  `SELECT id FROM categories WHERE slug = 'prompt-web' LIMIT 1`,
);
const categoryId = catRows[0]?.id;
if (!categoryId) {
  console.error("未找到「网页生成」分类(prompt-web)");
  process.exit(1);
}

let created = 0;
for (const p of PROJECTS) {
  const { rows: exists } = await client.query(
    `SELECT id FROM prompts WHERE slug = $1`,
    [p.slug],
  );
  if (exists.length > 0) {
    console.log(`↷ ${p.slug} 已存在,跳过`);
    continue;
  }
  const content = fs.readFileSync(p.promptFile, "utf8");
  const { rows } = await client.query(
    `INSERT INTO prompts
       (slug, title, description, content, "optimizedContent", kind,
        category_id, author, phase, source, status, "modelHint", uses)
     VALUES ($1,$2,$3,$4,$4,'precise',$5,'社区精选','v1','manual','published','通用',0)
     RETURNING id`,
    [p.slug, p.title, p.desc, content, categoryId],
  );
  await client.query(
    `UPDATE prompts
       SET attachments = COALESCE(attachments,'[]'::jsonb) || $1::jsonb
     WHERE id = $2`,
    [JSON.stringify([{ type: "link", url: p.demo, name: "在线演示" }]), rows[0].id],
  );
  created += 1;
  console.log(`✓ ${p.slug} ← ${p.demo}`);
}

console.log(`\n完成:新增 ${created} 条`);
await client.end();
