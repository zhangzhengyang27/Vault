import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type SourceType = "news" | "tool" | "prompt" | "github" | "knowledge";

/**
 * 数据源（白名单）：自动采集管道的入口配置。
 * 采集器按 crawlInterval 定时抓取，产出内容默认进入待审核队列。
 */
@Entity("sources")
export class Source {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column("text")
  url: string;

  @Column({ default: "news" })
  sourceType: SourceType;

  // 采集频率：minutely / hourly / daily / weekly
  @Column({ default: "hourly" })
  crawlInterval: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: "active" })
  status: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ default: "" })
  lastError: string;

  @Column({ type: "timestamptz", nullable: true })
  lastCrawledAt?: Date | null;

  @Column("int", { default: 0 })
  successCount: number;

  @Column("int", { default: 0 })
  failCount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
