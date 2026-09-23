import { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增 post_likes 表：帖子点赞落到后端（一人一帖一赞，唯一约束防并发重复） */
export class CreatePostLikes1725000001000 implements MigrationInterface {
  name = 'CreatePostLikes1725000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts (id)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_post_likes_user_post
      ON post_likes (user_id, post_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_likes_post
      ON post_likes (post_id)
    `);
    // 已有帖子无点赞数据来源（此前计数仅来自种子），保持现值不变
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS post_likes`);
  }
}
