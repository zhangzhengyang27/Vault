import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 为 mcps / resources 补上内容状态列，使其接入全站统一的状态机
 * （published / pending / rejected ...）。
 *
 * 背景：此前这两张表只有 phase 字段、没有 status，导致每日 4 点的
 * MCP Registry 同步把第三方内容直接写库并公开，绕过了「机器采集内容
 * 默认待审、人工审核后才发布」的约定。
 *
 * 迁移策略（存量公开、新建待审）：
 * - 存量数据全部保持 published，保证迁移前后前台可见内容完全一致，零风险；
 * - 新同步/采集的条目由代码写入 pending，需人工审核后才公开。
 */
export class AddStatusToMcpsAndResources1725200000000
  implements MigrationInterface
{
  name = 'AddStatusToMcpsAndResources1725200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mcps"
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'published'
    `);
    await queryRunner.query(`
      ALTER TABLE "resources"
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'published'
    `);
    // 兜底：确保存量行显式落值为 published，避免出现空值
    await queryRunner.query(
      `UPDATE "mcps" SET "status" = 'published' WHERE "status" IS NULL OR "status" = ''`,
    );
    await queryRunner.query(
      `UPDATE "resources" SET "status" = 'published' WHERE "status" IS NULL OR "status" = ''`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_mcps_status" ON "mcps" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_resources_status" ON "resources" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mcps_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_resources_status"`);
    await queryRunner.query(
      `ALTER TABLE "resources" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(`ALTER TABLE "mcps" DROP COLUMN IF EXISTS "status"`);
  }
}
