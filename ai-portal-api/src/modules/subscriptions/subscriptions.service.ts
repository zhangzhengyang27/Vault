import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import {
  Subscription,
  SubscriptionTargetType,
} from "../../entities/subscription.entity";
import { isPgErrorWithCode } from "../../common/pg-error";

export type PublishableItem = {
  type: string; // tool / prompt / article / news / post / repo
  id: number;
  title: string;
  slug?: string | null;
  description?: string | null;
  tags?: string[] | null;
  categoryName?: string | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
  ) {}

  async listByUser(userId: number) {
    return this.repo.find({
      where: { userId, active: true },
      order: { id: "DESC" },
    });
  }

  async subscribe(
    userId: number,
    targetType: SubscriptionTargetType,
    targetValue: string,
  ): Promise<Subscription | { duplicated: boolean }> {
    const existing = await this.repo.findOne({
      where: { userId, targetType, targetValue },
    });
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        return this.repo.save(existing);
      }
      return { duplicated: true };
    }
    try {
      return await this.repo.save(
        this.repo.create({ userId, targetType, targetValue }),
      );
    } catch (err) {
      // 并发下两个请求同时通过 exists 检查：唯一约束兜底，返回幂等的重复语义
      if (isPgErrorWithCode(err, "23505")) {
        return { duplicated: true };
      }
      throw err;
    }
  }

  async unsubscribe(userId: number, id: number) {
    const sub = await this.repo.findOne({ where: { id, userId } });
    if (!sub) return null;
    sub.active = false;
    return this.repo.save(sub);
  }

  async check(
    userId: number,
    targetType: SubscriptionTargetType,
    targetValue: string,
  ) {
    const sub = await this.repo.findOne({
      where: { userId, targetType, targetValue, active: true },
    });
    return !!sub;
  }

  /**
   * 匹配订阅：新内容发布后，找出所有应收到通知的用户。
   * 栏目订阅按名称匹配；标签订阅按标签列表匹配；关键词订阅按标题/描述包含匹配。
   * 通过按 targetType 定向查询 + 内存过滤，避免全表扫描。
   */
  async findMatchingSubscribers(item: PublishableItem): Promise<number[]> {
    const userIds = new Set<number>();
    const keyword = (item.title + " " + (item.description ?? "")).toLowerCase();

    // 1) 栏目订阅：按名称精确匹配
    if (item.categoryName) {
      const categorySubs = await this.repo.find({
        where: {
          active: true,
          targetType: "category",
          targetValue: ILike(item.categoryName),
        },
      });
      for (const s of categorySubs) userIds.add(s.userId);
    }

    // 2) 标签订阅：任一标签精确匹配
    if (item.tags && item.tags.length > 0) {
      const tagSubs = await this.repo.find({
        where: { active: true, targetType: "tag" },
      });
      for (const s of tagSubs) {
        if (
          item.tags.some((t) => t.toLowerCase() === s.targetValue.toLowerCase())
        ) {
          userIds.add(s.userId);
        }
      }
    }

    // 3) 关键词订阅：标题/描述包含匹配（关键词无界，需遍历）
    const keywordSubs = await this.repo.find({
      where: { active: true, targetType: "keyword" },
    });
    for (const s of keywordSubs) {
      if (keyword.includes(s.targetValue.toLowerCase())) {
        userIds.add(s.userId);
      }
    }

    return Array.from(userIds);
  }
}
