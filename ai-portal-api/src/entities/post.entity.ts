import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  @Column({ name: "author_name", default: "" })
  authorName: string;

  @Column()
  title: string;

  @Column("text")
  content: string;

  @Column("int", { default: 0 })
  likes: number;

  @Column("int", { default: 0 })
  comments: number;

  /** 阅读数：详情页每次公开访问 +1（无去重，与参考站口径一致） */
  @Column({ type: "int", default: 0 })
  views: number;

  /** 话题标签：simple-array 以逗号串存储，TypeORM 自动序列化/解析 */
  @Column({ type: "simple-array", nullable: true })
  tags: string[] | null;

  @Column({ default: "published" })
  status: string;

  @Column({ default: "v1" })
  phase: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
