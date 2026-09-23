#!/usr/bin/env node
/**
 * 知识库元数据种子：为 knowledge_bases 表写入描述 / 学习路径标记 / 排序。
 * 幂等（按 name upsert），可重复执行；缺失的知识库自动创建元数据行。
 *
 * 用法：node scripts/seed-kb-meta.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// name -> [description, isPath, sortOrder]
// isPath 仅在知识库已有有意义的分类分组时开启（路径视图按分类分阶段）
const KB_META = [
  ["AI 数据库与数据源", "论文、模型、评测、数据集、行业报告五大数据族的地图、实操与选型指南。", true, 1],
  ["LLM 应用开发实战", "基于吴恩达课程与 LangChain 的大模型应用开发实战：提示工程、RAG 与评估优化。", false, 2],
  ["AI Agent 从零实战", "从零搭建 AI Agent 的实战教程，覆盖核心概念、框架、工具调用与项目落地。", false, 3],
  ["Happy-LLM 大模型原理与实践", "大模型原理与实践的系统学习：Transformer、训练流程与预训练实战。", false, 4],
  ["Cursor 从入门到精通", "AI 原生编辑器 Cursor 的系统教程，从安装配置到 Rules 与进阶技巧。", false, 5],
  ["提示词", "提示词工程基础与进阶技巧合集，从结构化指令到复杂任务分解。", false, 6],
  ["大模型", "大模型原理、训练与应用的核心概念讲解。", false, 7],
  ["图像生成", "图像生成模型的原理与实践教程。", false, 8],
  ["Agent", "AI Agent 核心概念、四阶段工作流与系统提示词实践。", false, 9],
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

async function main() {
  const client = new pg.Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  let n = 0;
  for (const [name, description, isPath, sortOrder] of KB_META) {
    const res = await client.query(
      `INSERT INTO knowledge_bases (name, description, is_path, sort_order)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         is_path = EXCLUDED.is_path,
         sort_order = EXCLUDED.sort_order,
         updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [name, description, isPath, sortOrder],
    );
    console.log(`${res.rows[0].inserted ? "✓ 新增" : "↻ 更新"} ${name}`);
    n++;
  }
  await client.end();
  console.log(`\n===== 知识库元数据写入完成，共 ${n} 条 =====`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
