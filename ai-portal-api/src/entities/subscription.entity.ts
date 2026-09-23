import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

export type SubscriptionTargetType = "category" | "tag" | "keyword";

/**
 * 订阅：用户订阅栏目 / 标签 / 关键词，新内容发布后按此匹配生成站内通知。
 */
@Entity("subscriptions")
@Unique(["userId", "targetType", "targetValue"])
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ name: "target_type" })
  targetType: SubscriptionTargetType;

  @Column({ name: "target_value" })
  targetValue: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
