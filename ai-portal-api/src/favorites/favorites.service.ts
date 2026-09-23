import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Favorite } from "../entities/favorite.entity";
import { User } from "../entities/user.entity";
import { isPgErrorWithCode } from "../common/pg-error";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly repo: Repository<Favorite>,
  ) {}

  async create(
    userId: number,
    targetType: string,
    targetId: number,
    title?: string,
    targetSlug?: string,
  ) {
    // 防重复收藏
    const existing = await this.repo.findOne({
      where: { targetType, targetId, user: { id: userId } },
    });
    if (existing) {
      throw new ConflictException("已收藏过该内容");
    }
    const favorite = this.repo.create({
      user: { id: userId } as User,
      targetType,
      targetId,
      targetSlug: targetSlug?.slice(0, 200) ?? null,
      title: title?.slice(0, 200) ?? null,
    });
    try {
      return await this.repo.save(favorite);
    } catch (err) {
      // 并发下两个请求同时通过 exists 检查：数据库唯一索引兜底（ux_favorites_user_target）
      if (isPgErrorWithCode(err, "23505")) {
        throw new ConflictException("已收藏过该内容");
      }
      throw err;
    }
  }

  findAll(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { id: "DESC" },
    });
  }

  async remove(userId: number, id: number) {
    const favorite = await this.repo.findOne({
      where: { id, user: { id: userId } },
    });
    if (favorite) {
      await this.repo.remove(favorite);
    }
    return { success: true };
  }
}
