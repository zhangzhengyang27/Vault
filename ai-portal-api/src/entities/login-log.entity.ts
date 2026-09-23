import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 登录日志：成功与失败都记录，用于安全审计（暴力破解/异常登录排查） */
@Entity('login_logs')
@Index(['username'])
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number;

  /** 登录失败时可能无对应用户 */
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column()
  username: string;

  @Column({ default: true })
  success: boolean;

  /** 失败原因（如"用户名或密码错误"），成功时为空 */
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
