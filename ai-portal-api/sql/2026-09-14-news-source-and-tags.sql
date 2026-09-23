-- /news 功能丰富（2026-09-14）：为资讯补充来源与标签两类数据
-- 1) source_url：原文来源链接。RSS 采集写 item.link，Firecrawl 导入写抓取页 URL，
--    详情页展示「查看原文」；存量条目抓取时未保存链接，为 NULL（前端隐藏入口）。
-- 2) tags：来源分类标签（simple-array，text 存储，逗号分隔）。
--    RSS 采集写 mapTags 清洗后的 item.categories，订阅-通知管线的标签匹配随之生效。

ALTER TABLE news ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
ALTER TABLE news ADD COLUMN IF NOT EXISTS tags TEXT;

-- 留档：存量 75 条已发布资讯的原文链接在采集时被丢弃，无法从库内回填；
-- 如需补齐可对 RSS 源做标题回配（成功率不保证），或等新采集数据自然积累。
