import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 评论体验 P1：
 * 1. comment_likes 评论点赞表（一人一评一赞，冗余计数走 comments.likes）
 * 2. comments 加 parent_id（一级嵌套回复，自引用 FK CASCADE 删父带子）
 */
export class CommentLikesAndParentId1725700000000 implements MigrationInterface {
  name = 'CommentLikesAndParentId1725700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER
    `);
    await queryRunner.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0
    `);
    // 自引用外键：删父评论时 DB 级联删除子回复（服务层同时修正帖子评论计数）
    await queryRunner.query(`
      ALTER TABLE comments ADD CONSTRAINT fk_comments_parent
      FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        comment_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id)
          REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id)
          REFERENCES comments (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_comment_likes_user_comment
      ON comment_likes (user_id, comment_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_likes_comment
      ON comment_likes (comment_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_parent
      ON comments (parent_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS comment_likes`);
    await queryRunner.query(`ALTER TABLE comments DROP CONSTRAINT IF EXISTS fk_comments_parent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_comments_parent`);
    await queryRunner.query(`ALTER TABLE comments DROP COLUMN IF EXISTS parent_id`);
    await queryRunner.query(`ALTER TABLE comments DROP COLUMN IF EXISTS likes`);
  }
}
