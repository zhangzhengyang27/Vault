import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 知识库元数据表：知识库描述 / 学习路径标记 / 排序，
 * 以及 tools 增加官网地址字段（供文章关联工具与前台外链使用）
 */
export class KnowledgeBaseMetaAndToolWebsite1725100000000
  implements MigrationInterface
{
  name = 'KnowledgeBaseMetaAndToolWebsite1725100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_bases" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "is_path" BOOLEAN NOT NULL DEFAULT false,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_knowledge_bases_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "website" VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tools" DROP COLUMN IF EXISTS "website"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_bases"`);
  }
}
