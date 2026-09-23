-- 2026-09-14 /mcp 低质量条目清理
-- 判定依据（api.github.com repos 接口逐一核实,非网页探测）:
--   A. 仓库已删除/转私(404)且无站内替代 → 删除 19 条
--   B. 无任何端点的空壳条目(只有描述,无 endpoint/无安装方式) → 删除 7 条
--   C. 仓库改名(GitHub API 确认新地址存活) → 保留并更新 endpoint 3 条
-- 清理后 254 → 228 条。

-- ===== C. 改名条目:更新 endpoint =====
UPDATE mcps SET endpoint = 'github.com/haris-musa/excel-mcp-server' WHERE id = 870 AND slug = 'excel-mcp';       -- 原 haris-musa/excel-mcp 404
UPDATE mcps SET endpoint = 'github.com/vivekVells/mcp-pandoc'        WHERE id = 877 AND slug = 'pandoc-mcp';     -- 原 vivekVells/pandoc-mcp 404
UPDATE mcps SET endpoint = 'github.com/classfang/ssh-mcp-server'     WHERE id = 878 AND slug = 'ssh-mcp';        -- 原 classfang/ssh-mcp 404

-- ===== A. 死仓库(404 实锤) =====
-- github-mcp(id 1):github/mcp 不存在,站内 id 14 已有正确的 github/github-mcp-server,属陈旧重复
-- earnings-feed(357):earningsfeed.com 连根域名都不可达
DELETE FROM comments      WHERE target_type  = 'mcp' AND target_id  IN (
  1,    -- github-mcp(陈旧重复,替代 id 14)
  374,  -- mcp-62515458(shareAI-lab/wxapp)
  370,  -- jebmcp(pcjaat3844/jebmcp)
  418,  -- applescript-mcp-full-control-of-your-mac(Hassanali4/applescript-mcp)
  857,  -- baidu-ai-search-mcp(baidu/mcp-search)
  858,  -- baidu-map-mcp(baidu-maps/mcp-server)
  859,  -- figma-mcp(GLips/Figma-MCP,站内另有存活 Figma-Context-MCP)
  861,  -- akshare-stock-mcp(zwldarren/akshare-mcp,站内另有存活 akshare-mcp)
  862,  -- perplexity-mcp(perplexityai/pplx-mcp)
  863,  -- bytedance-puppeteer-mcp(bytedance/puppeteer-mcp)
  864,  -- baidubaike-mcp(baidubce/baidubaike-mcp)
  869,  -- powerpoint-mcp(antvis/mcp-server-ppt,站内另有存活 powerpoint-mcp-server)
  873,  -- flomo-mcp(xianminx/flomo-mcp)
  874,  -- didi-mcp(didi/didi-mcp)
  883,  -- google-workspace-mcp(googleworkspace/mcp)
  881,  -- pypi-mcp(loonghao/pypi-mcp)
  885,  -- hydra-db-mcp(hydra-db/mcp)
  886,  -- code-agent-manager(yodakeisuke/code-agent-manager)
  357   -- earnings-feed(站点不可达)
);
DELETE FROM favorites     WHERE target_type  = 'mcp' AND target_id  IN (1,374,370,418,857,858,859,861,862,863,864,869,873,874,883,881,885,886,357);
DELETE FROM notifications WHERE "targetType" = 'mcp' AND "targetId" IN (1,374,370,418,857,858,859,861,862,863,864,869,873,874,883,881,885,886,357);
DELETE FROM mcps          WHERE id IN (1,374,370,418,857,858,859,861,862,863,864,869,873,874,883,881,885,886,357);

-- ===== B. 无端点空壳 =====
-- github-bridge / notion-anki / figma-analyzer / figma-flutter / everart /
-- maton-mcp-server / everart-image-mcp:endpoint 为空(此前记录是首页/文档页,非 MCP 端点),
-- 无安装方式,除描述外对访客零可用信息
DELETE FROM comments      WHERE target_type  = 'mcp' AND target_id  IN (371,377,402,413,251,293,872);
DELETE FROM favorites     WHERE target_type  = 'mcp' AND target_id  IN (371,377,402,413,251,293,872);
DELETE FROM notifications WHERE "targetType" = 'mcp' AND "targetId" IN (371,377,402,413,251,293,872);
DELETE FROM mcps          WHERE id IN (371,377,402,413,251,293,872);

-- ===== 后续 =====
-- 1) seed.service.ts 按 slug「只插不改」补种:被删条目若留在 src/seed/data/mcps.json
--    会在 API 重启时复活,已同步移除 15 条并更新 3 条改名 endpoint(与本文件同批执行)。
-- 2) endpoint 变更后需重跑 scripts/probe-mcp-install.mjs 刷新 install_method/install_target。
