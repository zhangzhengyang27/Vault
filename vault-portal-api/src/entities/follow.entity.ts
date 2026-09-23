import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

/** 关注关系：follower 关注 following；唯一约束防并发重复关注 */
@Entity("follows")
@Unique(["followerId", "followingId"])
@Index(["followingId"])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "follower_id" })
  followerId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "follower_id" })
  follower: User;

  @Column({ name: "following_id" })
  followingId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "following_id" })
  following: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
