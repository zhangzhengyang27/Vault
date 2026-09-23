import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Refresh token 持久化：只存 SHA-256 哈希（库泄露不等于会话泄露）。
 * 支持撤销（改密码/登出/管理员强退）、轮换（每次刷新换新）与重用检测
 * （已轮换的 token 再次出现 → 撤销该用户全部 refresh token）
 */
@Entity("refresh_tokens")
@Index(["userId"])
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", type: "int" })
  userId: number;

  @Column({ name: "token_hash", type: "varchar", length: 64, unique: true })
  tokenHash: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
