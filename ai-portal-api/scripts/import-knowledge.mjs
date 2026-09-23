#!/usr/bin/env node
/**
 * 将 /Users/xiaoye/Downloads/提示词-专业版 导入 ai-portal 知识库
 * - 4 个知识库：提示词 / 大模型 / 图像生成 / Agent
 * - 删除文档内所有相对链接（[文字](./xxx.md) -> 文字）
 * - 通过后端 admin API 导入（需先登录获取 cookie）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== 配置 =====
const SRC_ROOT = "/Users/xiaoye/Downloads/提示词-专业版";
const API_BASE = "http://localhost:3003/api";
const COOKIE_FILE = "/tmp/ai_cookie.txt";
const PHASE = "external";

// 知识库名 -> 源目录 + slug 前缀
const KB_MAP = [
  { kb: "提示词",  dir: "提示词基础", prefix: "prompt-", category: "提示词工程" },
  { kb: "大模型",  dir: "大模型",     prefix: "llm-",   category: "大模型原理" },
  { kb: "图像生成", dir: "图像生成",  prefix: "image-",  category: "图像生成" },
  { kb: "Agent",  dir: "Agent",      prefix: "agent-pro-",  category: "Agent" },
];

// ===== 工具函数 =====
function readCookie() {
  if (!fs.existsSync(COOKIE_FILE)) {
    console.error("缺少 cookie 文件，请先登录: curl -c /tmp/ai_cookie.txt -X POST .../api/auth/login");
    process.exit(1);
  }
  const raw = fs.readFileSync(COOKIE_FILE, "utf8");
  const line = raw.split("\n").find((l) => /ai_portal_token/.test(l));
  if (!line) {
    console.error("cookie 文件中未找到 ai_portal_token");
    process.exit(1);
  }
  const token = line.split("\t").pop().trim();
  return `ai_portal_token=${token}`;
}

/** 删除相对链接：[文字](./xxx.md) 或 [文字](../xxx.md) -> 文字 */
function stripRelativeLinks(md) {
  return md.replace(/\[([^\]]*?)\]\((\.{1,2}\/[^)\s]*\.md)\)/g, "$1");
}

/** 提取文档首段引言（blockquote 的纯文本）作为 summary */
function extractSummary(md) {
  const m = /^> ([^\n]+)/m.exec(md.trim());
  if (m) return m[1].trim();
  // 无引言则取概述段首句
  const overview = /^## 1\. 概述\n\n([^\n]+)/m.exec(md);
  return overview ? overview[1].trim() : "";
}

function makeSlugSafe(slug) {
  return slug.replace(/[^\w\u4e00-\u9fa5-]/g, "").slice(0, 100);
}

// ===== 主流程 =====
async function main() {
  readCookie();

  let total = 0;
  for (const { kb, dir, prefix, category } of KB_MAP) {
    const dirPath = path.join(SRC_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      console.warn(`[跳过] 目录不存在: ${dirPath}`);
      continue;
    }
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".md"))
      .sort();

    console.log(`\n===== 知识库「${kb}」 (${files.length} 篇) =====`);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      let raw = fs.readFileSync(filePath, "utf8");

      // 标题 = 去掉首行 "# " 前缀
      const titleMatch = /^#\s+(.+)$/m.exec(raw);
      const title = (titleMatch?.[1] ?? path.basename(file, ".md")).trim();

      // slug：前缀 + 文件序号
      const seq = file.split("-")[0]; // "01"
      const slug = `${prefix}${seq}`;

      // 删除相对链接
      const content = stripRelativeLinks(raw);
      const summary = extractSummary(content) || title;

      const body = {
        slug,
        title,
        summary,
        content,
        knowledgeBase: kb,
        categoryId: null,
        status: "published",
        phase: PHASE,
      };

      // 先查询 slug 是否已存在，存在则跳过（幂等，避免重跑报 duplicate）
      const existRes = await fetch(
        `${API_BASE}/articles/${encodeURIComponent(slug)}`,
        { headers: { Cookie: readCookie() } },
      );
      if (existRes.ok) {
        console.log(`  - ${slug} | ${title} 已存在，跳过`);
        continue;
      }

      const res = await fetch(`${API_BASE}/admin/content/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: readCookie().replace(/\n/g, ""),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        total++;
        console.log(`  ✓ ${slug} | ${title} (${content.length} 字)`);
      } else {
        console.error(`  ✗ ${slug} | ${title} -> ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
      }
    }
  }

  console.log(`\n===== 导入完成，共 ${total} 篇 =====`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
