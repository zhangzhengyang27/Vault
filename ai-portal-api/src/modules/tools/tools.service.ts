import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets } from "typeorm";
import { Tool } from "../../entities/tool.entity";
import { Category } from "../../entities/category.entity";
import { CreateToolDto } from "./dto/create-tool.dto";
import { ContentCleanupService } from "../../common/content-cleanup.service";
import { escapeLike, LIKE_ESCAPE_SQL } from "../../common/like.util";

export interface ToolQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  q?: string;
  free?: boolean;
  sort?: string;
}

@Injectable()
export class ToolsService {
  constructor(
    @InjectRepository(Tool)
    private readonly repo: Repository<Tool>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: ToolQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder("tool");

    // 公开接口默认只返回已发布内容，pending/rejected 内容仅管理后台可见
    qb.andWhere("tool.status = :status", { status: "published" });

    if (query.category) {
      qb.leftJoin("tool.category", "category").andWhere(
        "category.name = :cat OR category.slug = :cat",
        { cat: query.category },
      );
    }
    if (query.tag) {
      qb.andWhere("tool.tags @> ARRAY[:tag]::text[]", { tag: query.tag });
    }
    if (query.free) {
      qb.andWhere("tool.isFree = :free", { free: true });
    }
    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where("tool.name ILIKE :q" + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          }).orWhere("tool.description ILIKE :q" + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          });
        }),
      );
    }

    switch (query.sort) {
      case "rating":
        qb.orderBy("tool.rating", "DESC");
        break;
      case "newest":
        qb.orderBy("tool.createdAt", "DESC");
        break;
      case "name":
        qb.orderBy("tool.name", "ASC");
        break;
      default:
        qb.orderBy("tool.id", "ASC");
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

  async findOne(slug: string) {
    // 公开详情只返回已发布内容（draft/pending/rejected 不可匿名直达）
    const entity = await this.repo.findOne({
      where: { slug, status: "published" },
    });
    if (!entity) throw new NotFoundException("工具不存在或未发布");
    return entity;
  }

  async create(dto: CreateToolDto) {
    const { categoryId, ...rest } = dto;
    const tool = this.repo.create({ ...rest, tags: rest.tags ?? [] });
    if (categoryId) {
      tool.category =
        (await this.categories.findOneBy({ id: categoryId })) ?? null;
    }
    return this.repo.save(tool);
  }

  async update(slug: string, dto: Partial<CreateToolDto>) {
    const tool = await this.repo.findOne({ where: { slug } });
    if (!tool) throw new NotFoundException("工具不存在");
    const { categoryId, ...rest } = dto;
    Object.assign(tool, rest);
    if (categoryId !== undefined) {
      tool.category =
        (await this.categories.findOneBy({ id: categoryId })) ?? null;
    }
    // slug 变更：先查重（唯一约束冲突裸 500 → 409），保存后同步
    // favorites/notifications 的 targetSlug 快照，避免收藏/通知跳转 404
    const oldSlug = tool.slug;
    if (rest.slug && rest.slug !== oldSlug) {
      const exists = await this.repo.findOne({ where: { slug: rest.slug } });
      if (exists) throw new ConflictException(`slug 已被占用: ${rest.slug}`);
    }
    let saved: Tool;
    try {
      saved = await this.repo.save(tool);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        throw new ConflictException(`slug 已被占用: ${rest.slug}`);
      }
      throw err;
    }
    if (rest.slug && rest.slug !== oldSlug) {
      await this.cleanup.syncSlug("tool", tool.id, rest.slug);
    }
    return saved;
  }
  async remove(slug: string) {
    const tool = await this.repo.findOne({ where: { slug } });
    if (!tool) throw new NotFoundException("工具不存在");
    await this.repo.remove(tool);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge("tool", tool.id);
    return tool;
  }
}
