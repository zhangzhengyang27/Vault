import { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增 reports 表：内容举报落地（此前前端举报按钮只打 console.log，数据被丢弃） */
export class CreateReports1725300000000 implements MigrationInterface {
  name = 'CreateReports1725300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        target_type VARCHAR NOT NULL,
        target_id INTEGER NOT NULL,
        target_title TEXT,
        reason TEXT NOT NULL,
        reporter VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status
      ON reports (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS reports`);
  }
}
