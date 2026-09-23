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
