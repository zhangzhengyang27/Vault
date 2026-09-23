import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

/**
 * 站内通知：订阅匹配推送 / 投稿审核结果 / 评论回复等。
 */
@Entity("notifications")
@Index(["userId"])
@Index(["read"])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ default: "system" })
  type: string;

  @Column()
  title: string;

  @Column("text", { nullable: true })
  content?: string | null;

  // 关联内容的类型与 ID，便于前端跳转（tool/prompt/article/news/post/submission）
  @Column({ default: "" })
  targetType: string;

  @Column({ type: "int", nullable: true })
  targetId?: number | null;

  // 目标内容 slug：详情路由按 slug 寻址，存快照避免通知跳转 404
  @Column({ type: "varchar", length: 200, nullable: true })
  targetSlug?: string | null;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
