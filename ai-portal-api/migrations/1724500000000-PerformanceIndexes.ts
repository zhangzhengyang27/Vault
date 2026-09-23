import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 常用查询 B-tree 索引（原 migrations/001_performance_indexes.sql 的
 * 非全文检索部分——*.sql 文件不会被 TypeORM 执行，这里转为正式迁移）。
 * pg_trgm GIN 模糊搜索索引不在此列：由 src/main.ts 的
 * ensureGinTrgmIndexes 在每次启动时确保存在（synchronize 会删除该类索引）。
 */
export class PerformanceIndexes1724500000000 implements MigrationInterface {
  name = 'PerformanceIndexes1724500000000';

  private readonly statements = [
    `CREATE INDEX IF NOT EXISTS idx_tools_status ON tools (status)`,
    `CREATE INDEX IF NOT EXISTS idx_tools_category_id ON tools (category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tools_created_at ON tools (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts (status)`,
    `CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON prompts (category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_prompts_kind ON prompts (kind)`,
    `CREATE INDEX IF NOT EXISTS idx_news_status ON news (status)`,
    `CREATE INDEX IF NOT EXISTS idx_news_time ON news (time)`,
    `CREATE INDEX IF NOT EXISTS idx_news_created_at ON news (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles (category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_crawl_logs_source_id ON crawl_logs ("sourceId")`,
    `CREATE INDEX IF NOT EXISTS idx_crawl_logs_created_at ON crawl_logs (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read)`,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of this.statements) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropNames = this.statements.map((sql) =>
      sql.match(/idx_\w+/)?.[0],
    );
    for (const name of dropNames) {
      if (name) await queryRunner.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
