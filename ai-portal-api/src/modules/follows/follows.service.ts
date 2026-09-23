import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../../entities/follow.entity';
import { User } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { isPgErrorWithCode } from '../../common/pg-error';
import { clampInt } from '../posts/posts.service';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly repo: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  private async findTargetUser(username: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    // 封禁用户对关注体系不可见（与 suggested/公开主页口径一致）
    if (!user || user.status !== 'active') {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /** 公开用户信息（不含 email/passwordHash） */
  private toPublicUser(u: User | null) {
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      bio: u.bio,
      role: u.role,
      createdAt: u.createdAt,
    };
  }

  async follow(
    follower: { id: number; username: string },
    targetUsername: string,
  ) {
    const target = await this.findTargetUser(targetUsername);
    if (target.id === follower.id) {
      throw new BadRequestException('不能关注自己');
    }
    let inserted = false;
    try {
      await this.repo.insert({
        followerId: follower.id,
        followingId: target.id,
      });
      inserted = true;
    } catch (err) {
      // 并发重复关注：唯一约束兜底为幂等成功
      if (!isPgErrorWithCode(err, '23505')) throw err;
    }
    // 只有首次关注才通知，避免反复取关/关注刷通知
    if (inserted) {
      await this.notifications.createForUser(target.id, {
        type: 'follow',
        title: `${follower.username} 关注了你`,
        content: '点击查看 TA 的主页',
        targetType: 'user',
        targetId: follower.id,
        targetSlug: follower.username,
      });
    }
    return { following: true };
  }

  async unfollow(followerId: number, targetUsername: string) {
    const target = await this.findTargetUser(targetUsername);
    await this.repo.delete({ followerId, followingId: target.id });
    return { following: false };
  }

  async isFollowing(followerId: number, targetUsername: string) {
    const target = await this.findTargetUser(targetUsername);
    const row = await this.repo.findOne({
      where: { followerId, followingId: target.id },
    });
    return { following: !!row };
  }

  /**
   * 批量查询关注状态（列表页 N+1 优化）：一次查询，返回 username → 是否已关注。
   * 上限 50 个用户名，与回填接口的 ids 上限口径一致。
   */
  async isFollowingBatch(meId: number, usernames: string[]) {
    const names = [
      ...new Set(usernames.map((u) => u.trim()).filter(Boolean)),
    ].slice(0, 50);
    const map: Record<string, boolean> = {};
    for (const n of names) map[n] = false;
    if (!names.length) return map;
    const rows = await this.repo
      .createQueryBuilder('f')
      .innerJoin(User, 'u', 'u.id = f.followingId')
      .where('f.followerId = :meId', { meId })
      .andWhere('u.username IN (:...names)', { names })
      .select('u.username', 'username')
      .getRawMany<{ username: string }>();
    for (const r of rows) map[r.username] = true;
    return map;
  }

  /** 粉丝列表：谁关注了 username */
  async listFollowers(username: string, page = 1, limit = 20) {
    const target = await this.findTargetUser(username);
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const [rows, total] = await this.repo.findAndCount({
      where: { followingId: target.id },
      order: { id: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      relations: { follower: true },
    });
    return {
      items: rows
        .map((r) => this.toPublicUser(r.follower))
        .map((u, i) => ({ ...u, followedAt: rows[i].createdAt })),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /** 关注列表：username 关注了谁 */
  async listFollowing(username: string, page = 1, limit = 20) {
    const target = await this.findTargetUser(username);
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const [rows, total] = await this.repo.findAndCount({
      where: { followerId: target.id },
      order: { id: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      relations: { following: true },
    });
    return {
      items: rows
        .map((r) => this.toPublicUser(r.following))
        .map((u, i) => ({ ...u, followedAt: rows[i].createdAt })),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
