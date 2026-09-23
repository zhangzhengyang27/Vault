import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * subscriptions 唯一索引落库：实体上的 @Unique 从未生成迁移，
 * synchronize 关闭导致并发重复订阅无法被数据库约束兜底（23505 处理形同虚设）。
 * 先清理已有重复行，再建唯一索引。
 */
export class SubscriptionUniqueIndex1725300001000 implements MigrationInterface {
  name = 'SubscriptionUniqueIndex1725300001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 保留每组重复中最早的一条
    await queryRunner.query(`
      DELETE FROM subscriptions a
      USING subscriptions b
      WHERE a.id > b.id
        AND a.user_id = b.user_id
        AND a.target_type = b.target_type
        AND a.target_value = b.target_value
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_user_target
      ON subscriptions (user_id, target_type, target_value)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_subscriptions_user_target`,
    );
  }
}
