import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import {
  PublishableItem,
  SubscriptionsService,
} from '../subscriptions/subscriptions.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async createForUser(
    userId: number,
    data: {
      type?: string;
      title: string;
      content?: string;
      targetType?: string;
      targetId?: number;
      targetSlug?: string;
    },
  ) {
    return this.repo.save(
      this.repo.create({
        userId,
        type: data.type ?? 'system',
        title: data.title,
        content: data.content,
        targetType: data.targetType ?? '',
        targetId: data.targetId ?? null,
        targetSlug: data.targetSlug ?? null,
        read: false,
      }),
    );
  }

  /**
   * 新内容发布后的订阅匹配推送：
   * 匹配栏目 / 标签 / 关键词的用户，生成站内通知。
   * options.excludeUserIds 用于跳过操作者本人（如投稿人已收到审核结果通知）。
   */
  async notifyContentPublished(
    item: PublishableItem,
    options: { excludeUserIds?: number[] } = {},
  ) {
    const exclude = new Set(options.excludeUserIds ?? []);
    const userIds = (
      await this.subscriptionsService.findMatchingSubscribers(item)
    ).filter((id) => !exclude.has(id));
    let sent = 0;
    for (const userId of userIds) {
      await this.createForUser(userId, {
        type: 'subscription',
        title: `你订阅的「${item.type}」有新内容：${item.title}`,
        content: item.description ?? undefined,
        targetType: item.type,
        targetId: item.id,
        targetSlug: item.slug ?? undefined,
      });
      sent++;
    }
    return { matchedUsers: userIds.length, sent };
  }

  async listByUser(
    userId: number,
    opts: {
      unreadOnly?: boolean;
      types?: string[];
      limit?: number;
      offset?: number;
    } = {},
  ) {
    // Number(x) || fallback：NaN/Infinity 一律回退默认值，避免 NaN 直达 SQL 变 500
    const rawLimit = Number(opts.limit);
    const rawOffset = Number(opts.offset);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.trunc(rawLimit)))
      : 20;
    const offset = Number.isFinite(rawOffset)
      ? Math.max(0, Math.trunc(rawOffset))
      : 0;
    const [items, total] = await this.repo.findAndCount({
      where: {
        userId,
        ...(opts.unreadOnly ? { read: false } : {}),
        // type 过滤供消息中心分类 tab 使用；空数组表示不过滤
        ...(opts.types?.length ? { type: In(opts.types) } : {}),
      },
      order: { id: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  async unreadCount(userId: number, types?: string[]) {
    return this.repo.count({
      where: {
        userId,
        read: false,
        ...(types?.length ? { type: In(types) } : {}),
      },
    });
  }

  async markRead(userId: number, id: number) {
    const noti = await this.repo.findOne({ where: { id, userId } });
    if (!noti) return null;
    noti.read = true;
    return this.repo.save(noti);
  }

  async markAllRead(userId: number) {
    await this.repo.update({ userId, read: false }, { read: true });
    return { success: true };
  }
}
