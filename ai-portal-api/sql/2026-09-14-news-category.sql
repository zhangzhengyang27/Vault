-- /news 分类下沉后端（2026-09-14）
-- 1) category 列：资讯内容分类（news-categories.ts 的 key）。
--    写入时由 classifyNewsCategory() 打标（爬虫 RSS / Firecrawl / 后台 / 种子
--    四个写入口共用），NULL 视同 industry（行业动态）。
-- 2) 索引：列表页按分类筛选 + 计数。
-- 3) 存量回填：由 scripts/backfill-news-category.mjs 执行（复用同一套规则），
--    不在 SQL 内重写关键词逻辑，避免两处规则漂移。

ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_news_category ON news (category);
