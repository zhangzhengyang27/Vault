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
import { Post } from "./post.entity";
import { User } from "./user.entity";

/** 帖子点赞：一人一帖只能赞一次（数据库唯一约束兜底并发） */
@Entity("post_likes")
@Unique(["user", "post"])
@Index(["post"])
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Post, { nullable: false })
  @JoinColumn({ name: "post_id" })
  post: Post;

  /**
   * post 的外键列。与上面的 @ManyToOne 指向同一列（post_id），
   * 显式映射出来是为了让「批量查询我已点赞的帖子」不必加载整个 Post 实体。
   * 该列在数据库中已存在，无需额外迁移。
   */
  @Column({ name: "post_id" })
  postId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
