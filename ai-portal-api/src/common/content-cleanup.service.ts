import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Favorite } from '../entities/favorite.entity';
import { Notification } from '../entities/notification.entity';

/**
 * 内容删除时的子行清理：comments / favorites / notifications 通过
 * (targetType, targetId) 多态关联内容主体，没有外键约束，
 * 内容删除后若不手动清理会留下永久孤儿行（评论还会出现在用户主页）。
 */
@Injectable()
export class ContentCleanupService {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    @InjectRepository(Favorite)
    private readonly favorites: Repository<Favorite>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async purge(targetType: string, targetId: number): Promise<void> {
    await Promise.all([
      this.comments.delete({ targetType, targetId }),
      this.favorites.delete({ targetType, targetId }),
      this.notifications.delete({ targetType, targetId }),
    ]);
  }

  /** slug 变更后同步 favorites/notifications 的 targetSlug 快照，避免跳转 404 */
  async syncSlug(
    targetType: string,
    targetId: number,
    slug: string,
  ): Promise<void> {
    await Promise.all([
      this.favorites.update({ targetType, targetId }, { targetSlug: slug }),
      this.notifications.update({ targetType, targetId }, { targetSlug: slug }),
    ]);
  }
}
