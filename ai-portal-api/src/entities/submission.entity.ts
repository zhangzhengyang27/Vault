import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type SubmissionType = 'tool' | 'prompt' | 'resource' | 'news' | 'mcp';

/**
 * 投稿：用户提交的工具 / 提示词 / 资源，默认进入待审核，
 * 审核通过后由管理员转为对应正式实体。
 */
@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column()
  type: SubmissionType;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description?: string | null;

  @Column('text', { nullable: true })
  content?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url?: string | null;

  @Column({ default: '' })
  contact: string;

  @Column({ default: 'pending' })
  status: string;

  @Column('text', { nullable: true })
  rejectReason?: string | null;

  @Column({ type: 'int', nullable: true })
  reviewedBy?: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  // 审核通过后生成的正式内容 ID（工具/提示词/资源）
  @Column({ type: 'int', nullable: true })
  contentId?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
