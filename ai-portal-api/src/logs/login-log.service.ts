import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginLog } from '../entities/login-log.entity';

export interface LoginLogInput {
  userId: number | null;
  username: string;
  success: boolean;
  message?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** 登录日志：写入（auth 登录流程）+ 管理端查询/清理 */
@Injectable()
export class LoginLogService {
  private readonly logger = new Logger(LoginLogService.name);

  constructor(
    @InjectRepository(LoginLog)
    private readonly repo: Repository<LoginLog>,
  ) {}

  /** 记录失败不影响主流程，吞掉异常仅打日志 */
  async record(input: LoginLogInput): Promise<void> {
    try {
      await this.repo.insert({
        userId: input.userId,
        username: input.username.slice(0, 100),
        success: input.success,
        message: input.message ?? null,
        ip: input.ip ?? null,
        userAgent: (input.userAgent ?? '').slice(0, 500) || null,
      });
    } catch (e) {
      this.logger.warn(
        `登录日志写入失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async list(params: {
    page: number;
    limit: number;
    username?: string;
    success?: boolean;
  }): Promise<{ items: LoginLog[]; total: number }> {
    const qb = this.repo.createQueryBuilder('log');
    if (params.username) {
      qb.andWhere('log.username ILIKE :username', {
        username: `%${params.username}%`,
      });
    }
    if (params.success !== undefined) {
      qb.andWhere('log.success = :success', { success: params.success });
    }
    qb.orderBy('log.createdAt', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async clear(): Promise<void> {
    await this.repo.clear();
  }
}
