-- 工具重复数据清理（2026-09-14，/spotlight 内容补充复查发现）
-- 「纳米AI」存在两条同名已发布记录：
--   id 760 (tool-69242883, rating 0, 2026-08-15 采集)
--   id 1628 (nano-ai, rating 4.3) —— 场景专题策划引用的是这一条
-- 两条均为 360「纳米AI」产品（纳米搜索改名沿革），保留高评分条目。
-- 删除前已核实 id 760 无收藏/评论引用（favorites/comments 均 0）。
-- 另：「稿定AI」同样存在重复（tool-16114703 有 488 条收藏 vs gaoding-ai 0 条），
-- 因涉及收藏数据迁移，本次仅标记不处理。

DELETE FROM comments WHERE target_type = 'tool' AND target_id = 760;
DELETE FROM favorites WHERE target_type = 'tool' AND target_id = 760;
DELETE FROM notifications WHERE "targetType" = 'tool' AND "targetId" = 760;
DELETE FROM tools WHERE id = 760 AND slug = 'tool-69242883' AND name = '纳米AI';

-- ============ 补充（同日复查确认，均零收藏/零评论） ============
-- 稿定AI 重复：gaoding-ai（rating 4.2，slug 规范）与 tool-16114703（rating 0）。
-- 此前报告中的"488 条收藏"系笔误（488 是行 ID），核实两者收藏均为 0，
-- 无需迁移数据，直接删除低质量爬虫行。
DELETE FROM comments WHERE target_type = 'tool' AND target_id = (SELECT id FROM tools WHERE slug = 'tool-16114703');
DELETE FROM favorites WHERE target_type = 'tool' AND target_id = (SELECT id FROM tools WHERE slug = 'tool-16114703');
DELETE FROM notifications WHERE "targetType" = 'tool' AND "targetId" = (SELECT id FROM tools WHERE slug = 'tool-16114703');
DELETE FROM tools WHERE slug = 'tool-16114703' AND name = '稿定AI' AND rating = 0;

-- 纳米搜索：与「纳米AI」（rating 4.3）为同一产品改名沿革，保留纳米AI。
DELETE FROM comments WHERE target_type = 'tool' AND target_id = (SELECT id FROM tools WHERE slug = 'tool-82560273');
DELETE FROM favorites WHERE target_type = 'tool' AND target_id = (SELECT id FROM tools WHERE slug = 'tool-82560273');
DELETE FROM notifications WHERE "targetType" = 'tool' AND "targetId" = (SELECT id FROM tools WHERE slug = 'tool-82560273');
DELETE FROM tools WHERE slug = 'tool-82560273' AND name = '纳米搜索' AND rating = 0;
