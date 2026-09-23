import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 内容举报：登录用户提交，管理员在后台处理后标记 resolved */
@Entity('reports')
@Index(['status'])
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  /** 目标内容类型（tool/prompt/article/news/repo/resource/mcp/post） */
  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ name: 'target_id' })
  targetId: number;

  /** 提交时的目标标题快照（目标可能被改名/删除，快照保证可读） */
  @Column({ name: 'target_title', type: 'text', nullable: true })
  targetTitle: string | null;

  @Column({ type: 'text' })
  reason: string;

  /** 提交人用户名快照（不建外键，用户删除后举报记录仍保留） */
  @Column({ type: 'varchar', nullable: true })
  reporter: string | null;

  /** open / resolved */
  @Column({ default: 'open' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
