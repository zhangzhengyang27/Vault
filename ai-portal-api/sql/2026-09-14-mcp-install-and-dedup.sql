-- 2026-09-14 /mcp 页面排查修复
-- 1) mcps 新增安装方式落库列(由 scripts/probe-mcp-install.mjs 探测回填)
-- 2) 修复 9 条 unknown 的脏 endpoint + 官方远程 MCP 端点
-- 3) 删除 5 条重复条目(endpoint 归一化后指向同一项目,互动数据均为 0)

-- ===== 1. 新列 =====
ALTER TABLE mcps ADD COLUMN IF NOT EXISTS install_method VARCHAR(20);
ALTER TABLE mcps ADD COLUMN IF NOT EXISTS install_target VARCHAR(300);
COMMENT ON COLUMN mcps.install_method IS '安装方式(探测落库):npx/uvx/docker/remote/unknown;NULL=未探测,前端回退启发式';
COMMENT ON COLUMN mcps.install_target IS '安装目标:npm 包名 / PyPI 包名 / 镜像名 / 远程 URL';

-- ===== 2. endpoint 修复 =====
-- 官方参考服务器:endpoint 统一为仓库根(src/* 子路径使前端 GitHub 解析失效,安装方式由探测脚本精确回填)
UPDATE mcps SET endpoint = 'github.com/modelcontextprotocol/servers'
WHERE slug IN ('everything-mcp','fetch-mcp','filesystem-mcp','git-mcp','memory-mcp','sequential-thinking-mcp','time-mcp');

-- 官方托管远程 MCP:补全真实端点(mcp.notion.com/mcp 已 401 验证存在)
UPDATE mcps SET endpoint = 'https://mcp.notion.com/mcp' WHERE slug = 'notion-mcp' AND endpoint = 'notion.com/mcp';
UPDATE mcps SET endpoint = 'https://mcp.slack.com/mcp'  WHERE slug = 'slack-mcp'  AND endpoint = 'slack.com/mcp';

-- GitLab Duo MCP:文档页换成真实 API 端点
UPDATE mcps SET endpoint = 'https://gitlab.com/api/v4/mcp'
WHERE slug = 'gitlab-mcp-server' AND endpoint LIKE 'https://docs.gitlab.com%';

-- gitlab-mcp(社区版 zereight/gitlab-mcp,package.json 探测确认):脏 endpoint 换成真实仓库
UPDATE mcps SET endpoint = 'github.com/zereight/gitlab-mcp' WHERE slug = 'gitlab-mcp' AND endpoint = 'github.com/modelcontextprotocol/servers';

-- 脏 endpoint(首页/文档页/无关仓库根,不是 MCP 端点):置空走「手动配置」
UPDATE mcps SET endpoint = NULL
WHERE slug IN ('github-bridge','notion-anki','figma-analyzer','figma-flutter','everart','maton-mcp-server','everart-image-mcp');

-- ===== 3. 去重(保留 slug 更规范/描述更准确的一条) =====
-- playwright-mcp(15) 保留,删 playwright-mcp-server(234)
-- chrome-devtools-mcp(16) 保留,删 chrome-devtools-mcp-server(237)
-- brave-search(278) 保留(描述更全),删 brave-search-mcp(33)
-- minimax-mcp(242) 保留,删 minimax-multimodal-mcp(867)(同一 repo 大小写重复)
-- time-mcp(12) 保留,删 time(244)(endpoint 为同一官方服务器的 tree 链接)
DELETE FROM comments      WHERE target_type  = 'mcp' AND target_id  IN (234,237,33,867,244);
DELETE FROM favorites     WHERE target_type  = 'mcp' AND target_id  IN (234,237,33,867,244);
DELETE FROM notifications WHERE "targetType" = 'mcp' AND "targetId" IN (234,237,33,867,244);
DELETE FROM mcps          WHERE id IN (234,237,33,867,244);

-- ===== 4. 种子数据同步清理 =====
-- seed.service.ts 每次启动按 slug「只插不改」补种，删除的条目若仍在
-- src/seed/data/mcps.json 会在 API 重启时重生（brave-search-mcp、
-- minimax-multimodal-mcp 曾以新 id 888/889 复活），已同步从种子 JSON 移除。

-- ===== 4. 种子数据同步清理 =====
-- seed.service.ts 每次启动按 slug「只插不改」补种，删除的条目若仍在
-- src/seed/data/mcps.json 会在 API 重启时重生（brave-search-mcp、
-- minimax-multimodal-mcp 曾以新 id 888/889 复活），已同步从种子 JSON 移除。
