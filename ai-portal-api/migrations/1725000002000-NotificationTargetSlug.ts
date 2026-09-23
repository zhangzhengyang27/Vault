import { MigrationInterface, QueryRunner } from 'typeorm';

/** notifications 增加 target_slug：详情路由按 slug 寻址，通知跳转不再指向 404 */
export class NotificationTargetSlug1725000002000 implements MigrationInterface {
  name = 'NotificationTargetSlug1725000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "targetSlug" VARCHAR(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications DROP COLUMN IF EXISTS "targetSlug"
    `);
  }
}
