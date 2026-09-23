import { Injectable } from '@nestjs/common';

export interface OnlineUserEntry {
  userId: number;
  username: string;
  role: string;
  ip: string | null;
  userAgent: string | null;
  lastSeen: number;
}

/**
 * 在线用户注册表（内存实现）。
 * JWT 本身无状态，这里以"最近活跃"近似在线：
 * - JwtAuthGuard 每次鉴权调用 touch() 刷新最后活跃时间
 * - 强退 = 加入撤销集合，守卫与 refresh 端点立即拒绝该用户，重启后自动失效
 * 数据规模为管理后台量级，内存 Map 足够；如需多实例部署再迁移到 Redis
 */
@Injectable()
export class OnlineUserService {
  /** 活跃窗口：30 分钟内有请求视为在线 */
  private static readonly ACTIVE_WINDOW_MS = 30 * 60 * 1000;

  private readonly active = new Map<number, OnlineUserEntry>();
  private readonly revoked = new Set<number>();

  /** 鉴权通过后刷新活跃信息；返回 false 表示该用户已被强退 */
  touch(
    user: { id: number; username: string; role: string },
    req: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ): boolean {
    if (this.revoked.has(user.id)) return false;
    this.active.set(user.id, {
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: req.ip ?? null,
      userAgent: (req.headers?.['user-agent'] as string) ?? null,
      lastSeen: Date.now(),
    });
    return true;
  }

  isRevoked(userId: number): boolean {
    return this.revoked.has(userId);
  }

  /** 重新登录可解除强退标记 */
  clearRevoked(userId: number): void {
    this.revoked.delete(userId);
  }

  /** 强制下线：立即从在线列表移除并拒绝其后续请求 */
  revoke(userId: number): void {
    this.revoked.add(userId);
    this.active.delete(userId);
  }

  list(): OnlineUserEntry[] {
    const now = Date.now();
    const rows: OnlineUserEntry[] = [];
    for (const entry of this.active.values()) {
      if (now - entry.lastSeen > OnlineUserService.ACTIVE_WINDOW_MS) {
        this.active.delete(entry.userId);
        continue;
      }
      rows.push(entry);
    }
    return rows.sort((a, b) => b.lastSeen - a.lastSeen);
  }
}
