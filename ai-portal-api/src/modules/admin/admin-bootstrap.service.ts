import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';

/**
 * 管理员账号引导：
 * 配置环境变量 ADMIN_USERNAME / ADMIN_PASSWORD（可选 ADMIN_EMAIL）后，
 * 应用启动时自动创建或提升管理员账号。未配置时不执行任何操作。
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!username && !password) {
      return; // 未配置，跳过
    }
    if (!username || !password) {
      this.logger.warn(
        'ADMIN_USERNAME 与 ADMIN_PASSWORD 需同时配置才会创建管理员账号',
      );
      return;
    }
    // 与 CLI create-admin 一致的最小强度校验，防止配置失误产生弱口令管理员
    if (password.length < 6) {
      this.logger.error(
        'ADMIN_PASSWORD 至少需要 6 位，已跳过管理员引导创建。请修改环境变量后重启。',
      );
      return;
    }

    const exists = await this.users.findOne({ where: { username } });
    if (exists) {
      if (exists.role !== 'admin') {
        exists.role = 'admin';
        await this.users.save(exists);
        this.logger.warn(`已把用户「${username}」提升为管理员`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(
      this.users.create({
        username,
        email: process.env.ADMIN_EMAIL?.trim() || null,
        passwordHash,
        role: 'admin',
        status: 'active',
      }),
    );
    this.logger.log(`已创建管理员账号：${username}`);
  }
}
