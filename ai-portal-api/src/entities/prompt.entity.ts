import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('prompts')
@Index(['status'])
@Index(['category'])
@Index(['createdAt'])
@Index(['kind'])
export class Prompt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  content: string;

  // 优化版提示词（LLM 语义重写后的高质量出图提示词），与原内容互不破坏
  @Column('text', { nullable: true })
  optimizedContent: string | null;

  @ManyToOne(() => Category, { eager: true, nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ nullable: true })
  modelHint: string;

  @Column({ default: '' })
  author: string;

  @Column('int', { default: 0 })
  uses: number;

  @Column({ default: 'published' })
  status: string;

  @Column({ default: 'mvp' })
  phase: string;

  @Column({ default: 'general' })
  kind: string;

  // 来源：seed=种子数据，manual=用户手动创建
  @Column({ default: 'seed' })
  source: string;

  @Column('jsonb', { nullable: true })
  attachments: { type: string; url: string; name: string }[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
