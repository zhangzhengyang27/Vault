import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets } from "typeorm";
import { News } from "../../entities/news.entity";
import { CreateNewsDto } from "./dto/create-news.dto";
import { ContentCleanupService } from "../../common/content-cleanup.service";
import { escapeLike, LIKE_ESCAPE_SQL } from "../../common/like.util";

export interface NewsQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  category?: string;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly repo: Repository<News>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: NewsQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder("news");

    // 公开接口默认只返回已发布内容
    qb.andWhere("news.status = :status", { status: "published" });

    // 分类在写入时由 classifyNewsCategory 打标（见 news-categories.ts）；
    // NULL 视同 industry（行业动态），与计数端口的口径一致
    if (query.category) {
      if (query.category === "industry") {
        qb.andWhere(
          new Brackets((w) => {
            w.where("news.category = :category").orWhere(
              "news.category IS NULL",
            );
          }),
        ).setParameter("category", "industry");
      } else {
        qb.andWhere("news.category = :category", { category: query.category });
      }
    }

    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where("news.title ILIKE :q" + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          }).orWhere("news.summary ILIKE :q" + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          });
        }),
      );
    }

    switch (query.sort) {
      case "newest":
        qb.orderBy("news.createdAt", "DESC");
        break;
      default:
        qb.orderBy("news.id", "ASC");
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    // 列表接口不返回完整 content，减少传输量
    const itemsWithoutContent = items.map(({ content, ...rest }) => rest);

    return {
      items: itemsWithoutContent,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** 各分类的已发布条目计数（列表页 chips 用）；NULL 归入 industry */
  async countByCategory() {
    const rows = await this.repo
      .createQueryBuilder("news")
      .select("COALESCE(news.category, 'industry')", "key")
      .addSelect("COUNT(*)", "count")
      .where("news.status = :status", { status: "published" })
      .groupBy("COALESCE(news.category, 'industry')")
      .getRawMany<{ key: string; count: string }>();
    return rows.map((r) => ({ key: r.key, count: Number(r.count) }));
  }

  async findOne(slug: string) {
    // 公开详情只返回已发布内容（draft/pending/rejected 不可匿名直达）
    const entity = await this.repo.findOne({
      where: { slug, status: "published" },
    });
    if (!entity) throw new NotFoundException("资讯不存在或未发布");
    return entity;
  }

  async create(dto: CreateNewsDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(slug: string, dto: Partial<CreateNewsDto>) {
    const news = await this.repo.findOne({ where: { slug } });
    if (!news) throw new NotFoundException("资讯不存在");
    const rest = dto;
    Object.assign(news, rest);
    // slug 变更：先查重（唯一约束冲突裸 500 → 409），保存后同步
    // favorites/notifications 的 targetSlug 快照，避免收藏/通知跳转 404
    const oldSlug = news.slug;
    if (rest.slug && rest.slug !== oldSlug) {
      const exists = await this.repo.findOne({ where: { slug: rest.slug } });
      if (exists) throw new ConflictException(`slug 已被占用: ${rest.slug}`);
    }
    let saved: News;
    try {
      saved = await this.repo.save(news);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        throw new ConflictException(`slug 已被占用: ${rest.slug}`);
      }
      throw err;
    }
    if (rest.slug && rest.slug !== oldSlug) {
      await this.cleanup.syncSlug("news", news.id, rest.slug);
    }
    return saved;
  }
  async remove(slug: string) {
    const news = await this.repo.findOne({ where: { slug } });
    if (!news) throw new NotFoundException("资讯不存在");
    await this.repo.remove(news);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge("news", news.id);
    return news;
  }
}
