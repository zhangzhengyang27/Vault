import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 社区闭环 P0：
 * 1. users 扩展展示资料（nickname/avatar/bio），列名用小写单词规避大小写引号问题
 * 2. 新增 follows 关注关系表（唯一约束防重复关注，CHECK 防自我关注）
 */
export class UserProfileAndFollows1725600000000 implements MigrationInterface {
  name = 'UserProfileAndFollows1725600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(30)
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500)
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(200)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id)
          REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_follows_following FOREIGN KEY (following_id)
          REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT ck_follows_not_self CHECK (follower_id <> following_id)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_follows_pair
      ON follows (follower_id, following_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_follows_following
      ON follows (following_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS follows`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS nickname`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS avatar`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS bio`);
  }
}
