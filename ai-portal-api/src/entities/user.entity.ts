import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Exclude } from "class-transformer";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  email: string | null;

  // @Exclude + 全局 ClassSerializerInterceptor：任何接口响应都不得携带密码哈希
  @Exclude()
  @Column({ type: "varchar", length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ default: "user" })
  role: string;

  @Column({ default: "active" })
  status: string;

  /** 展示昵称：空时前端回退到 username */
  @Column({ type: "varchar", length: 30, nullable: true })
  nickname: string | null;

  /** 头像图片 URL：空时前端用首字母色块 */
  @Column({ type: "varchar", length: 500, nullable: true })
  avatar: string | null;

  /** 个人简介 */
  @Column({ type: "varchar", length: 200, nullable: true })
  bio: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
