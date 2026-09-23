import { MigrationInterface, QueryRunner } from 'typeorm';

/** 社区 P2：posts 加阅读数计数与话题标签（simple-array 逗号串存储） */
export class PostViewsAndTags1725800000000 implements MigrationInterface {
  name = 'PostViewsAndTags1725800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_views ON posts (views DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_posts_views`);
    await queryRunner.query(`ALTER TABLE posts DROP COLUMN IF EXISTS tags`);
    await queryRunner.query(`ALTER TABLE posts DROP COLUMN IF EXISTS views`);
  }
}
