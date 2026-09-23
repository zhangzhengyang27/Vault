-- 2026-09-14 /github 开源列表数据污染清理
-- 判定依据（sources 表 + repos 表逐一核对）:
--   数据源 #5「GitHub 官方博客」(https://github.blog/feed/) 被配成 sourceType='github'，
--   爬虫对 github 类型直接落 repos 表（crawler.service.ts saveItem），博客文章被当成
--   「开源项目」发布。特征：stars/lang 为空、phase='crawl'、description 存原始 HTML、
--   slug 带 makeSlug 哈希后缀。本次共 10 条（id 84-93）。
-- 处理：删除污染条目；按选定方案停用该数据源（不改 sourceType）。

-- ===== 停用数据源 #5：GitHub 官方博客（博客文章不属于仓库语义） =====
UPDATE sources SET enabled = false WHERE id = 5 AND url = 'https://github.blog/feed/';

-- ===== 删除污染条目（末尾带特征条件，防 id 漂移误删真实仓库） =====
DELETE FROM comments      WHERE target_type  = 'repo' AND target_id IN (
  84,  -- the-august-17-outage-and-the-work-ahead-e2775ab2
  85,  -- github-copilot-app-for-beginners-managing-your-work-e8724508
  86,  -- how-canvases-make-agentic-workflows-visible-steerable-and-co-a6d86d5e
  87,  -- how-to-bring-your-software-delivery-workflow-into-github-wit-115ecf6c
  88,  -- your-guide-to-github-universe-2026-is-here-the-schedule-just-474a5dd6
  89,  -- what-50-open-source-projects-taught-us-about-security-in-the-368a3e62
  90,  -- github-availability-report-july-2026-b0aa08c3
  91,  -- github-copilot-app-for-beginners-write-your-first-prompt-38b84cc1
  92,  -- your-contributors-are-ai-first-now-is-your-project-3a263c3b
  93   -- from-coder-to-orchestrator-how-agents-shift-the-role-of-a-de-a982e6f7
);
DELETE FROM favorites     WHERE target_type  = 'repo' AND target_id IN (84,85,86,87,88,89,90,91,92,93);
DELETE FROM notifications WHERE "targetType" = 'repo' AND "targetId" IN (84,85,86,87,88,89,90,91,92,93);
DELETE FROM repos WHERE id IN (84,85,86,87,88,89,90,91,92,93)
  AND stars IS NULL AND lang IS NULL AND phase = 'crawl';

-- ===== 后续 =====
-- 1) 爬虫 saveItem 的 github 分支已加「链接必须是 github.com/<owner>/<repo>」防御，
--    以后即使再配错源，博客条目也进不了 repos 表；github 分支 description 改用
--    剥过标签的 summary，不再存原始 HTML。
-- 2) seed/data/sources.json 仍含该源（种子「只插不改」，只影响全新库）；新库若重建
--    该源，会被上述防御拦截，不会落脏数据。
-- 3) repos 公开列表已加 stars 非空过滤（repos.service.ts），双保险。
