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

@Entity("tools")
@Index(["status"])
@Index(["category"])
@Index(["createdAt"])
export class Tool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column("text")
  description: string;

  /** 官网地址，用于详情页外链与文章关联工具匹配 */
  @Column({ type: "varchar", length: 500, nullable: true })
  website?: string | null;

  @Column("text", { nullable: true })
  content: string;

  @ManyToOne(() => Category, { eager: true, nullable: true })
  @JoinColumn({ name: "category_id" })
  category: Category | null;

  @Column("text", { array: true, default: "{}" })
  tags: string[];

  @Column("float", { default: 0 })
  rating: number;

  @Column({ default: true })
  isFree: boolean;

  @Column({ default: false })
  requiresLogin: boolean;

  @Column("float", { default: 0 })
  qualityScore: number;

  @Column({ default: "published" })
  status: string;

  @Column({ default: "mvp" })
  phase: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
