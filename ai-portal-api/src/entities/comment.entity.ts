import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('comments')
@Index(['postId'])
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'author_name', default: '' })
  authorName: string;

  @Column({ name: 'post_id', type: 'int', nullable: true })
  postId: number | null;

  /** 评论目标类型：post / tool / prompt / article / news */
  @Column({ name: 'target_type', default: 'post' })
  targetType: string;

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId: number | null;

  @Column('text')
  content: string;

  @Column({ type: 'int', nullable: true })
  rating?: number | null;

  /** 一级嵌套回复：指向顶级评论 id，null 为顶级评论 */
  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  /** 点赞冗余计数（comment_likes 聚合维护，列表页免聚合查询） */
  @Column({ type: 'int', default: 0 })
  likes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
