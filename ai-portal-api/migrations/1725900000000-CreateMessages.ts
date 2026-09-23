import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 私信 IM：单表消息模型，会话 = 两人之间的消息集合。
 * read 只标记「收件人是否已读」；CHECK 防自发自收。
 */
export class CreateMessages1725900000000 implements MigrationInterface {
  name = 'CreateMessages1725900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id)
          REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id)
          REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT ck_messages_not_self CHECK (sender_id <> receiver_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_receiver_read
      ON messages (receiver_id, read)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_pair
      ON messages (sender_id, receiver_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created
      ON messages (created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS messages`);
  }
}
