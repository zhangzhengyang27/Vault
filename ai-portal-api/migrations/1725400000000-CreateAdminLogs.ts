import { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增 login_logs / oper_logs 表：系统监控（登录日志、操作日志）落地 */
export class CreateAdminLogs1725400000000 implements MigrationInterface {
  name = 'CreateAdminLogs1725400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username VARCHAR(100) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        message TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_username
      ON login_logs (username)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_created_at
      ON login_logs (created_at)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS oper_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username VARCHAR(100) NOT NULL,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(300) NOT NULL,
        status_code INTEGER NOT NULL,
        ip TEXT,
        user_agent TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        body TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_oper_logs_username
      ON oper_logs (username)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_oper_logs_created_at
      ON oper_logs (created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS oper_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS login_logs`);
  }
}
