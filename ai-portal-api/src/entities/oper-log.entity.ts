import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** 操作日志：管理端变更类请求（POST/PATCH/PUT/DELETE）自动落库 */
@Entity("oper_logs")
@Index(["username"])
export class OperLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", type: "int", nullable: true })
  userId: number | null;

  @Column()
  username: string;

  @Column()
  method: string;

  @Column()
  path: string;

  @Column({ name: "status_code" })
  statusCode: number;

  @Column({ type: "text", nullable: true })
  ip: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string | null;

  @Column({ name: "duration_ms" })
  durationMs: number;

  /** 请求体 JSON（脱敏后截断保存），详情查看用 */
  @Column({ type: "text", nullable: true })
  body: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
