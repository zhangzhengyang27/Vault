import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Category } from "./category.entity";

@Entity("articles")
@Index(["status"])
@Index(["category"])
@Index(["createdAt"])
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column("text")
  summary: string;

  @Column("text", { nullable: true })
  content?: string;

  @ManyToOne(() => Category, { eager: true, nullable: true })
  @JoinColumn({ name: "category_id" })
  category: Category | null;

  @Column({ default: "published" })
  status: string;

  @Column({ default: "mvp" })
  phase: string;

  @Column({ type: "timestamptz", nullable: true })
  publishedAt: Date | null;

  @Column({
    name: "knowledge_base",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  knowledgeBase?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
