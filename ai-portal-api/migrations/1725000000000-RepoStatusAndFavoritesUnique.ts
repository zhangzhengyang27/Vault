import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1) repos 增加 status 列：采集的 GitHub 内容此前没有审核状态，
 *    导致审核队列对 github 类型必然 500（where status 报未知列）、审核操作静默无效。
 *    存量数据回填为 published（历史上直接展示），新采集默认 pending。
 * 2) favorites 增加唯一索引：实体上的 @Unique 从未落库（synchronize 关闭且无迁移），
 *    先查后插在并发下会重复收藏，需要数据库约束兜底。
 */
export class RepoStatusAndFavoritesUnique1725000000000 implements MigrationInterface {
  name = 'RepoStatusAndFavoritesUnique1725000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // repos.status：带默认值回填存量行
    await queryRunner.query(`
      ALTER TABLE repos ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT 'published'
    `);

    // favorites 去重（保留每组最早的记录），否则唯一索引创建会失败
    await queryRunner.query(`
      DELETE FROM favorites a
      USING favorites b
      WHERE a.id > b.id
        AND a.user_id = b.user_id
        AND a.target_type = b.target_type
        AND a.target_id = b.target_id
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_favorites_user_target
      ON favorites (user_id, target_type, target_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS ux_favorites_user_target
    `);
    await queryRunner.query(`
      ALTER TABLE repos DROP COLUMN IF EXISTS status
    `);
  }
}
