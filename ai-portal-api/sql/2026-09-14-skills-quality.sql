-- /skills 页面排查修复（2026-09-14）
-- 1) 新增 source_url 列：技能文件的实际来源仓库（endpoint 存安装路径，两者互补）
-- 2) 为可核实来源的 11 条技能回填来源仓库
-- 3) 标签修正：Anthropic 官方技能（github.com/anthropics/skills）补「Claude 官方」
-- 4) 删除 2 条种子占位脏数据（id 4/5，endpoint 为非路径非 URL 的占位值）

-- ============ 1. 表结构 ============
ALTER TABLE mcps ADD COLUMN IF NOT EXISTS source_url VARCHAR(300);

-- ============ 2. 来源仓库回填 ============
-- 9 条 Anthropic 官方技能（api.github.com/repos/anthropics/skills 目录核实）
UPDATE mcps SET source_url = 'https://github.com/anthropics/skills'
WHERE slug IN ('frontend-design','pdf','docx','pptx','xlsx','skill-creator','doc-coauthoring','mcp-builder','brand-guidelines');
-- UI/UX Pro Max（GitHub 搜索精确命中 nextlevelbuilder/ui-ux-pro-max-skill，★127k）
UPDATE mcps SET source_url = 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill'
WHERE slug = 'ui-ux-pro-max';
-- Web Design Guidelines（本机安装副本 metadata author=vercel，仓库 vercel-labs/web-interface-guidelines）
UPDATE mcps SET source_url = 'https://github.com/vercel-labs/web-interface-guidelines'
WHERE slug = 'web-design-guidelines';

-- ============ 3. 标签修正 ============
UPDATE mcps SET tags = '效率工具,软件开发,Claude 官方' WHERE slug = 'frontend-design' AND type = 'skill';
UPDATE mcps SET tags = '效率工具,文档处理,Claude 官方' WHERE slug IN ('pdf','docx','xlsx','skill-creator','doc-coauthoring') AND type = 'skill';
UPDATE mcps SET tags = '文档处理,内容与媒体,Claude 官方' WHERE slug = 'pptx' AND type = 'skill';
UPDATE mcps SET tags = '软件开发,Claude 官方' WHERE slug = 'mcp-builder' AND type = 'skill';
UPDATE mcps SET tags = '效率工具,Claude 官方' WHERE slug = 'brand-guidelines' AND type = 'skill';

-- ============ 4. 删除种子占位脏数据 ============
-- filesystem-skill (id 4) / web-search-skill (id 5)：
-- endpoint 分别为 workspace/filesystem、tools/web-search，既不是 URL 也不是
-- 可执行的安装路径，详情页渲染出无法执行的安装指令；2026-08-15 与种子同批的占位数据。
-- 先清理多态子行（comments/favorites 为 snake_case，notifications 为 camelCase），
-- 注意 targetType='mcp' 限定 mcps 表内容，避免误删其他类型同 id 的关联行。
DELETE FROM comments WHERE target_type = 'mcp' AND target_id IN (4, 5);
DELETE FROM favorites WHERE target_type = 'mcp' AND target_id IN (4, 5);
DELETE FROM notifications WHERE "targetType" = 'mcp' AND "targetId" IN (4, 5);
DELETE FROM mcps WHERE id IN (4, 5) AND slug IN ('filesystem-skill', 'web-search-skill') AND type = 'skill';

-- ============ 5. 留档 ============
-- seed 复活风险：src/seed/data/mcps.json 原含上述 2 条 skill（本次已同步移除，
-- 46 -> 44 条）。删除数据库行时必须同步清理种子 JSON，否则 API 重启时
-- seed.service.ts 的 onApplicationBootstrap 会按 slug 重新插入。
-- skills.json 的 23 条技能同步补齐 sourceUrl 与新标签（仅影响全新初始化，
-- 存量行走本文件的 UPDATE）。
