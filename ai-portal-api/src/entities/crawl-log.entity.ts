import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 采集日志：记录每次采集任务的执行结果，用于排查与运营复盘。
 */
@Entity('crawl_logs')
@Index(['sourceId'])
@Index(['createdAt'])
export class CrawlLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sourceId: number;

  @Column()
  sourceName: string;

  @Column({ default: 'news' })
  sourceType: string;

  // success / partial / failed
  @Column({ default: 'success' })
  status: string;

  @Column('int', { default: 0 })
  fetchedCount: number;

  @Column('int', { default: 0 })
  newCount: number;

  @Column('int', { default: 0 })
  duplicateCount: number;

  @Column('text', { nullable: true })
  error?: string | null;

  @Column('int', { default: 0 })
  durationMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
