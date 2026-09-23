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
import { Comment } from "./comment.entity";
import { User } from "./user.entity";

/** 评论点赞：一人一评只能赞一次（数据库唯一约束兜底并发） */
@Entity("comment_likes")
@Unique(["user", "comment"])
@Index(["comment"])
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Comment, { nullable: false })
  @JoinColumn({ name: "comment_id" })
  comment: Comment;

  /**
   * comment 的外键列。与上面的 @ManyToOne 指向同一列（comment_id），
   * 显式映射出来是为了「批量查询我已点赞的评论」不必加载整个 Comment 实体。
   * 该列在数据库中已存在，无需额外迁移。
   */
  @Column({ name: "comment_id" })
  commentId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
