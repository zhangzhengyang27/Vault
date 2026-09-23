-- 清洗 29 条内容迁移导入的爬取教程（slug 形如 resource-XXXXXXXX）：
-- 1) 描述全部在恰好 200 字符处硬截断（29/29 句中截断，原始全文已不可得），
--    统一追加省略号明示截断，避免"读着读着突然没了"的观感。
-- 2) 类型"教程"改为"视频教程"：这批是 B 站风格的视频教程文章，与精选
--    官方教程（hugging-face-learn 等）混用同一类型会拉低"精选"质感，
--    也让列表页类型筛选失真。原始全文与真实来源 URL 均不可考，故不做补全。
-- 执行时间: 2026-09-14

-- 1) 截断描述补省略号
UPDATE resources
SET description = description || '……'
WHERE slug LIKE 'resource-%'
  AND length(description) >= 199;

-- 2) 类型改标
UPDATE resources
SET type = '视频教程'
WHERE slug LIKE 'resource-%'
  AND type = '教程';
