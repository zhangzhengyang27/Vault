import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('news')
@Index(['status'])
@Index(['time'])
@Index(['createdAt'])
@Index(['category'])
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column('text')
  summary: string;

  @Column('text', { nullable: true })
  content?: string;

  @Column({ default: '' })
  time: string;

  /**
   * 内容分类（news-categories.ts 的 key）：写入时由 classifyNewsCategory 打标，
   * NULL 视同 industry（行业动态）。列表筛选/计数均基于库内值。
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  category?: string;

  /** 原文来源链接（RSS item.link / Firecrawl 抓取页 URL），用于详情页溯源 */
  @Column({ type: 'varchar', name: 'source_url', nullable: true })
  sourceUrl?: string;

  /** 来源分类标签（simple-array，逗号分隔存储；RSS categories 经 mapTags 清洗） */
  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column({ default: 'published' })
  status: string;

  @Column({ default: 'mvp' })
  phase: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
