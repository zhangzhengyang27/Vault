import { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增 refresh_tokens 表：refresh token 持久化（可撤销/轮换/重用检测） */
export class CreateRefreshTokens1725500000000 implements MigrationInterface {
  name = 'CreateRefreshTokens1725500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
      ON refresh_tokens (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
      ON refresh_tokens (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
  }
}
