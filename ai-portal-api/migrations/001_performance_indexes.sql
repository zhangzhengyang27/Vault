-- 性能优化 migration：添加搜索扩展与常用查询索引
-- 执行：psql -U zhangzhengyang -d ai_portal -f migrations/001_performance_indexes.sql

-- 1. 启用 pg_trgm 扩展，支持 ILIKE 模糊查询的 GIN 索引
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. 模糊搜索 GIN 索引（tools）
CREATE INDEX IF NOT EXISTS idx_tools_name_trgm ON tools USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tools_description_trgm ON tools USING gin (description gin_trgm_ops);

-- 3. 模糊搜索 GIN 索引（prompts）
CREATE INDEX IF NOT EXISTS idx_prompts_title_trgm ON prompts USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prompts_description_trgm ON prompts USING gin (description gin_trgm_ops);

-- 4. 模糊搜索 GIN 索引（news）
CREATE INDEX IF NOT EXISTS idx_news_title_trgm ON news USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_news_summary_trgm ON news USING gin (summary gin_trgm_ops);

-- 5. 模糊搜索 GIN 索引（articles）
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_summary_trgm ON articles USING gin (summary gin_trgm_ops);

-- 6. 模糊搜索 GIN 索引（repos）
CREATE INDEX IF NOT EXISTS idx_repos_name_trgm ON repos USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_repos_description_trgm ON repos USING gin (description gin_trgm_ops);

-- 7. 模糊搜索 GIN 索引（mcps）
CREATE INDEX IF NOT EXISTS idx_mcps_name_trgm ON mcps USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mcps_description_trgm ON mcps USING gin (description gin_trgm_ops);

-- 8. 模糊搜索 GIN 索引（resources）
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm ON resources USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_description_trgm ON resources USING gin (description gin_trgm_ops);

-- 9. 常用查询 B-tree 索引
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools (status);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON tools (category_id);
CREATE INDEX IF NOT EXISTS idx_tools_created_at ON tools (created_at);

CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts (status);
CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON prompts (category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts (created_at);
CREATE INDEX IF NOT EXISTS idx_prompts_kind ON prompts (kind);

CREATE INDEX IF NOT EXISTS idx_news_status ON news (status);
CREATE INDEX IF NOT EXISTS idx_news_time ON news (time);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news (created_at);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles (created_at);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_source_id ON crawl_logs ("sourceId");
CREATE INDEX IF NOT EXISTS idx_crawl_logs_created_at ON crawl_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read);
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增字段：
 * - comments.rating：评论评分（1-5，可空）
 * - favorites.title：收藏内容标题快照（可空，最多200字符）
 */
export class AddRatingAndFavoriteTitle1724600000000 implements MigrationInterface {
  name = 'AddRatingAndFavoriteTitle1724600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // comments 表加 rating 列
    await queryRunner.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS rating INTEGER
    `);

    // favorites 表加 title 列
    await queryRunner.query(`
      ALTER TABLE favorites ADD COLUMN IF NOT EXISTS title VARCHAR(200)
    `);

    // favorites 表加 target_slug 列（用于详情页跳转）
    await queryRunner.query(`
      ALTER TABLE favorites ADD COLUMN IF NOT EXISTS target_slug VARCHAR(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE favorites DROP COLUMN IF EXISTS target_slug
    `);
    await queryRunner.query(`
      ALTER TABLE favorites DROP COLUMN IF EXISTS title
    `);
    await queryRunner.query(`
      ALTER TABLE comments DROP COLUMN IF EXISTS rating
    `);
  }
}
