-- /news 页面排查修复（2026-09-14）
-- 删除 4 条早期手写的演示资讯（id 1-4）：
--   new-open-model / multi-agent-trend / ai-video-commercial / mcp-standard-draft
-- 问题：
--   1) time 为「2 小时前 / 5 小时前 / 昨天」这类相对时间字符串，已永久冻结，
--      列表/时间线据此排序后，假内容霸占「最新」位置且时间线分组顺序错乱；
--   2) 内容为编造的占位新闻（无真实来源），与站内真实资讯混杂；
--   3) phase 为全站仅有的 3 个 mvp + 1 个 v1，徽章无语义。
-- 前端配套：列表改用 sort=newest、时间线分组只认 YYYY-MM-DD、news 类型隐藏 phase 徽章。

-- 先清理多态子行（comments/favorites 为 snake_case，notifications 为 camelCase），
-- targetType='news' 限定资讯内容，避免误删其他类型同 id 的关联行。
DELETE FROM comments WHERE target_type = 'news' AND target_id IN (1, 2, 3, 4);
DELETE FROM favorites WHERE target_type = 'news' AND target_id IN (1, 2, 3, 4);
DELETE FROM notifications WHERE "targetType" = 'news' AND "targetId" IN (1, 2, 3, 4);
DELETE FROM news WHERE id IN (1, 2, 3, 4)
  AND slug IN ('new-open-model', 'multi-agent-trend', 'ai-video-commercial', 'mcp-standard-draft');

-- 留档：src/seed/data/news.json 已同步移除上述 4 条（19 -> 15 条）。
-- 删除数据库行必须同步清理种子 JSON，否则 API 重启时 seed.service.ts
-- 的 onApplicationBootstrap 会按 slug 重新插入。
