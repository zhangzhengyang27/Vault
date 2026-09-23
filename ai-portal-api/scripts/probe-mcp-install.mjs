#!/usr/bin/env node
/**
 * MCP 安装方式探测脚本
 *
 * 用法：
 *   node scripts/probe-mcp-install.mjs [--dry]
 *
 * 对每条 type=mcp 的记录，根据 endpoint 探测 GitHub 仓库根的
 * package.json / pyproject.toml，把 install_method / install_target 落库：
 *   npx/uvx  —— 从 package.json / pyproject.toml 的 name 精确读取
 *               （修复前端启发式把 npm 项目误判为 uvx 的问题）
 *   remote   —— endpoint 即远程 URL
 *   unknown  —— 仓库存在但无标准清单（Go/Rust 等），前端显示「手动配置」
 *   NULL     —— 网络失败或 endpoint 为空，前端继续走启发式推断
 *
 * 官方参考服务器（modelcontextprotocol/servers 的子目录）无法从仓库根
 * 推断包名，走 OVERRIDES 精确映射。raw.githubusercontent.com 为 CDN，
 * 不占用 GitHub API 限额。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const CONCURRENCY = 4;

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

/** 官方参考服务器等无法从仓库根自动推断的条目，按 slug 精确映射 */
const OVERRIDES = {
  "everything-mcp": { method: "npx", target: "@modelcontextprotocol/server-everything" },
  "filesystem-mcp": { method: "npx", target: "@modelcontextprotocol/server-filesystem" },
  "memory-mcp": { method: "npx", target: "@modelcontextprotocol/server-memory" },
  "sequential-thinking-mcp": { method: "npx", target: "@modelcontextprotocol/server-sequential-thinking" },
  "fetch-mcp": { method: "uvx", target: "mcp-server-fetch" },
  "git-mcp": { method: "uvx", target: "mcp-server-git" },
  "time-mcp": { method: "uvx", target: "mcp-server-time" },
  // 官方参考服务器集合索引，非单一可安装服务
  "modelcontextprotocol-servers": { method: "unknown", target: null },
};

/** 解析 endpoint 里的 GitHub owner/repo，兼容 https:// 前缀、.git 后缀与 /tree/... 路径 */
function parseGithubRepo(endpoint) {
  const m = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i.exec(endpoint);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ai-portal-install-probe" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return { status: res.status, text: null };
  return { status: 200, text: await res.text() };
}

/** 探测 GitHub 仓库：返回 { method, target } 或 { networkError: true } */
async function probeGithub(owner, repo) {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD`;
  try {
    // npm:package.json 的 name 字段就是可 npx 的包名
    const pkg = await fetchText(`${base}/package.json`);
    if (pkg.status === 200 && pkg.text) {
      try {
        const name = JSON.parse(pkg.text).name;
        if (typeof name === "string" && name.trim()) {
          return { method: "npx", target: name.trim() };
        }
      } catch {
        /* package.json 不是合法 JSON，继续探测其他清单 */
      }
    }

    // Python:pyproject.toml 的 project.name 即可 uvx 的 PyPI 分发名
    const py = await fetchText(`${base}/pyproject.toml`);
    if (py.status === 200 && py.text) {
      const m = /^\s*name\s*=\s*["']([^"']+)["']/m.exec(py.text);
      if (m) return { method: "uvx", target: m[1] };
    }

    // Go / Rust 等无标准化客户端安装方式
    const go = await fetchText(`${base}/go.mod`);
    if (go.status === 200) return { method: "unknown", target: null };
    const cargo = await fetchText(`${base}/Cargo.toml`);
    if (cargo.status === 200) return { method: "unknown", target: null };

    // 仓库存在但无已知清单（如 monorepo 子目录结构），保守标 unknown
    if (pkg.status === 404 && py.status === 404) {
      return { method: "unknown", target: null };
    }
    return { method: "unknown", target: null };
  } catch {
    return { networkError: true };
  }
}

async function processRow(client, row) {
  const { id, slug, endpoint } = row;

  if (OVERRIDES[slug]) {
    const { method, target } = OVERRIDES[slug];
    return { id, slug, method, target, via: "override" };
  }

  const ep = (endpoint ?? "").trim();
  if (!ep) return { id, slug, method: null, target: null, via: "no-endpoint" };

  const lower = ep.toLowerCase();

  const repo = parseGithubRepo(ep);
  if (repo) {
    const r = await probeGithub(repo.owner, repo.repo);
    if (r.networkError) return { id, slug, method: null, target: null, via: "network-error" };
    return { id, slug, method: r.method, target: r.target, via: `${r.method ?? "?"} <- ${repo.owner}/${repo.repo}` };
  }

  // 远程 HTTP(S) MCP
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return { id, slug, method: "remote", target: ep, via: "remote" };
  }

  // npm 形态：@scope/name 或裸包名
  if (/^@[^/\s]+\/[^/\s]+$/.test(ep) || /^[a-z0-9][a-z0-9._-]*$/i.test(ep)) {
    return { id, slug, method: "npx", target: ep, via: "npm-like" };
  }

  return { id, slug, method: "unknown", target: null, via: "unrecognized" };
}

async function main() {
  const client = new pg.Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  const { rows } = await client.query(
    `SELECT id, slug, endpoint FROM mcps WHERE type = 'mcp' AND status = 'published' ORDER BY id`,
  );
  console.log(`待探测 ${rows.length} 条，并发 ${CONCURRENCY}…\n`);

  const results = new Array(rows.length);
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const i = cursor++;
      results[i] = await processRow(client, rows[i]);
      process.stdout.write(`  [${i + 1}/${rows.length}] ${results[i].slug}: ${results[i].via}\n`);
      await new Promise((r) => setTimeout(r, 40));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  let applied = 0;
  let unknown = 0;
  let keptNull = 0;
  for (const r of results) {
    if (r.method === null) {
      keptNull++;
      continue; // 探测失败/无 endpoint:保持 NULL,前端走启发式
    }
    if (r.method === "unknown") unknown++;
    if (!DRY) {
      await client.query(
        `UPDATE mcps SET install_method = $1, install_target = $2 WHERE id = $3`,
        [r.method, r.target, r.id],
      );
    }
    applied++;
  }

  await client.end();
  console.log(
    `\n===== 完成${DRY ? "(dry run)" : ""}：落库 ${applied} 条（unknown ${unknown}），保持 NULL ${keptNull} 条 =====`,
  );
  if (!DRY) console.log("提示：install_method 落库后前端优先采用，无需重启。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
