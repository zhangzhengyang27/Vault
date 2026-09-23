import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tool } from "../../entities/tool.entity";
import { Prompt } from "../../entities/prompt.entity";
import { Article } from "../../entities/article.entity";
import { News } from "../../entities/news.entity";
import { Mcp } from "../../entities/mcp.entity";
import { Repo } from "../../entities/repo.entity";
import { Resource } from "../../entities/resource.entity";
import { Category } from "../../entities/category.entity";
import { makeSlug } from "../../common/slug.util";
import { CONTENT_STATUSES } from "./dto/admin-content.dto";
import { NotificationsService } from "../notifications/notifications.service";
import {
  classifyNewsCategory,
  NEWS_CATEGORY_KEYS,
  NewsCategoryKey,
} from "../news/news-categories";
import { ContentCleanupService } from "../../common/content-cleanup.service";
import { escapeLike, LIKE_ESCAPE_SQL } from "../../common/like.util";

/** 管理端创建/编辑时必填的标题字段（用于校验与生成 slug） */
const REQUIRED_TITLE: Record<ContentType, string> = {
  tools: "name",
  prompts: "title",
  articles: "title",
  news: "title",
  mcps: "name",
  repos: "name",
  resources: "title",
};

/** 各类型在 DB 中 NOT NULL 且无默认值的额外必填字段（缺失会触发裸 500） */
const REQUIRED_EXTRA: Record<ContentType, string[]> = {
  tools: ["description"],
  prompts: ["description", "content"],
  articles: ["summary"],
  news: ["summary"],
  mcps: [],
  repos: [],
  resources: [],
};

export type ContentType =
  "tools" | "prompts" | "articles" | "news" | "mcps" | "repos" | "resources";

interface ContentQuery {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

interface TypeConfig {
  titleField: string;
  searchFields: string[];
  hasCategory: boolean;
  /** 允许写入的字段（DTO 键 → 实体列） */
  fields: string[];
  /** 列表查询额外带出的列（如 mcps 的 type 徽标列） */
  listFields?: string[];
}

/**
 * 管理端内容记录的通用形状。
 * 四类内容（tools/prompts/articles/news）字段名并不一致，仓储层刻意按
 * ContentType 动态切换实体，因此用「最小公共形状 + 索引签名」承接，
 * 并在仓储边界处显式收窄，避免 any 继续向下游扩散。
 */
export interface ContentRecord {
  id: number;
  slug?: string;
  status?: string;
  category?: { name?: string } | null;
  [field: string]: unknown;
}

/** 管理端提交的内容字段集合（键为实体列名，值类型随列而定） */
type ContentDto = Record<string, unknown>;

/**
 * 取出字符串字段。
 *
 * 这些字段已由 `AdminContentDto` 的 `@IsString()` 在入口校验过，
 * 到达服务层时必为 string；这里只做类型收窄，非字符串一律视为空值，
 * 与原有 `String(v)` 对合法输入的结果一致。
 */
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const TYPE_CONFIG: Record<ContentType, TypeConfig> = {
  tools: {
    titleField: "name",
    searchFields: ["name", "description"],
    hasCategory: true,
    fields: [
      "slug",
      "name",
      "description",
      "content",
      "tags",
      "rating",
      "isFree",
      "requiresLogin",
      "phase",
    ],
  },
  prompts: {
    titleField: "title",
    searchFields: ["title", "description"],
    hasCategory: true,
    fields: [
      "slug",
      "title",
      "description",
      "content",
      "optimizedContent",
      "modelHint",
      "author",
      "phase",
      "kind",
      "source",
    ],
  },
  articles: {
    titleField: "title",
    searchFields: ["title", "summary"],
    hasCategory: true,
    fields: ["slug", "title", "summary", "content", "phase", "knowledgeBase"],
  },
  news: {
    titleField: "title",
    searchFields: ["title", "summary"],
    hasCategory: false,
    fields: ["slug", "title", "summary", "content", "time", "phase"],
  },
  mcps: {
    titleField: "name",
    searchFields: ["name", "description"],
    hasCategory: false,
    listFields: ["type"],
    fields: [
      "slug",
      "name",
      "description",
      "endpoint",
      "type",
      "tags",
      "installMethod",
      "installTarget",
      "sourceUrl",
      "phase",
    ],
  },
  repos: {
    titleField: "name",
    searchFields: ["name", "description"],
    hasCategory: false,
    fields: ["slug", "name", "description", "stars", "lang", "phase"],
  },
  resources: {
    titleField: "title",
    searchFields: ["title", "description"],
    hasCategory: false,
    fields: ["slug", "title", "type", "description", "sourceUrl", "phase"],
  },
};

/** 管理端类型 → 对外内容类型（通知/收藏等 targetType 使用单数形式） */
const CONTENT_TYPE_ALIASES: Record<ContentType, string> = {
  tools: "tool",
  prompts: "prompt",
  articles: "article",
  news: "news",
  mcps: "mcp",
  repos: "repo",
  resources: "resource",
};

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(Tool)
    private readonly tools: Repository<Tool>,
    @InjectRepository(Prompt)
    private readonly prompts: Repository<Prompt>,
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    @InjectRepository(News)
    private readonly news: Repository<News>,
    @InjectRepository(Mcp)
    private readonly mcps: Repository<Mcp>,
    @InjectRepository(Repo)
    private readonly repos: Repository<Repo>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly notificationsService: NotificationsService,
    private readonly cleanup: ContentCleanupService,
  ) {}

  private getRepo(type: ContentType): Repository<any> {
    switch (type) {
      case "tools":
        return this.tools;
      case "prompts":
        return this.prompts;
      case "articles":
        return this.articles;
      case "news":
        return this.news;
      case "mcps":
        return this.mcps;
      case "repos":
        return this.repos;
      case "resources":
        return this.resources;
      default:
        throw new BadRequestException("不支持的内容类型");
    }
  }

  private getConfig(type: ContentType): TypeConfig {
    const cfg = TYPE_CONFIG[type];
    if (!cfg) throw new BadRequestException("不支持的内容类型");
    return cfg;
  }

  /** 管理端列表：返回全部状态（含 draft/pending/archived），支持 status 过滤与搜索 */
  async list(type: ContentType, query: ContentQuery = {}) {
    const cfg = this.getConfig(type);
    const repo = this.getRepo(type);
    const alias = type;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = repo.createQueryBuilder(alias);
    qb.select([
      `${alias}.id`,
      `${alias}.slug`,
      `${alias}.${cfg.titleField}`,
      `${alias}.status`,
      `${alias}.createdAt`,
    ]);
    if (cfg.hasCategory) {
      qb.leftJoin(`${alias}.category`, "cat").addSelect([
        "cat.id",
        "cat.name",
        "cat.slug",
      ]);
    }
    for (const extra of cfg.listFields ?? []) {
      qb.addSelect(`${alias}.${extra}`);
    }
    if (query.status && query.status !== "all") {
      qb.andWhere(`${alias}.status = :status`, { status: query.status });
    }
    if (query.q) {
      const conds = cfg.searchFields.map(
        (f, i) => `${alias}.${f} ILIKE :q${i}${LIKE_ESCAPE_SQL}`,
      );
      const params: Record<string, string> = {};
      cfg.searchFields.forEach((_, i) => {
        params[`q${i}`] = `%${escapeLike(query.q)}%`;
      });
      qb.andWhere(`(${conds.join(" OR ")})`, params);
    }
    qb.orderBy(`${alias}.id`, "DESC");

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const items = rows as ContentRecord[];

    return { items, total, page, limit };
  }

  async findOne(type: ContentType, id: number) {
    const cfg = this.getConfig(type);
    const repo = this.getRepo(type);
    const entity = (await repo.findOne({
      where: { id },
      relations: cfg.hasCategory ? { category: true } : undefined,
    })) as ContentRecord | null;
    if (!entity) throw new NotFoundException("内容不存在");
    return entity;
  }

  async create(type: ContentType, dto: ContentDto) {
    const cfg = this.getConfig(type);
    const repo = this.getRepo(type);

    const title = asString(dto[REQUIRED_TITLE[type]]);
    if (!title.trim()) {
      throw new BadRequestException(`缺少标题字段 ${REQUIRED_TITLE[type]}`);
    }
    this.assertRequiredFields(type, dto);
    this.assertStatus(dto.status);

    const data: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      if (dto[f] !== undefined) data[f] = dto[f];
    }
    if (!data.slug) {
      data.slug = makeSlug(title);
    }
    data.status = dto.status ?? "published";
    if (!("phase" in data)) data.phase = "admin";
    if (type === "news") {
      // 资讯写入时打分类标（与爬虫路径共用规则）；显式传入合法 key 时以传入值为准
      const explicit = asString(data.category);
      data.category =
        explicit && NEWS_CATEGORY_KEYS.includes(explicit as NewsCategoryKey)
          ? explicit
          : classifyNewsCategory({
              title,
              summary: asString(data.summary),
            });
    }

    const entity = repo.create(data) as ContentRecord;
    await this.applyCategory(type, entity, dto);
    const saved = (await repo.save(entity)) as ContentRecord;

    // 直接发布的内容同样触发订阅推送（此前只有投稿审核路径会通知）
    if (saved.status === "published") {
      await this.notifySubscribers(type, saved).catch(() => undefined);
    }
    return saved;
  }

  async update(type: ContentType, id: number, dto: ContentDto) {
    const cfg = this.getConfig(type);
    const repo = this.getRepo(type);
    const entity = (await repo.findOne({
      where: { id },
    })) as ContentRecord | null;
    if (!entity) throw new NotFoundException("内容不存在");
    this.assertStatus(dto.status);
    const prevStatus = entity.status;

    for (const f of cfg.fields) {
      if (dto[f] !== undefined) entity[f] = dto[f];
    }
    if (dto.status !== undefined) entity.status = dto.status as string;
    if (type === "news") {
      // 资讯的 category 是字符串列（区别于 tools 的 Category 关联形状），
      // ContentRecord 的关联类型在此不适用，经 unknown 窄化回 News 实体读写
      const newsEntity = entity as unknown as News;
      const explicit = asString(dto.category);
      newsEntity.category =
        explicit && NEWS_CATEGORY_KEYS.includes(explicit as NewsCategoryKey)
          ? explicit
          : classifyNewsCategory({
              title: asString(entity.title),
              summary: asString(entity.summary),
              tags: newsEntity.tags ?? null,
            });
    }
    await this.applyCategory(type, entity, dto);
    const saved = (await repo.save(entity)) as ContentRecord;

    // 仅在「首次发布/重新上架」时推送订阅，编辑已发布内容不重复打扰
    if (saved.status === "published" && prevStatus !== "published") {
      await this.notifySubscribers(type, saved).catch(() => undefined);
    }
    return saved;
  }

  async remove(type: ContentType, id: number) {
    const repo = this.getRepo(type);
    const entity = (await repo.findOne({
      where: { id },
    })) as ContentRecord | null;
    if (!entity) throw new NotFoundException("内容不存在");
    await repo.remove(entity);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge(CONTENT_TYPE_ALIASES[type], id);
    return { success: true, id };
  }

  /** 发布内容后的订阅匹配推送（失败由调用方吞掉，不影响管理操作本身） */
  private async notifySubscribers(type: ContentType, entity: ContentRecord) {
    const rawTags = entity.tags;
    await this.notificationsService.notifyContentPublished({
      type: CONTENT_TYPE_ALIASES[type],
      id: entity.id,
      title: asString(entity[TYPE_CONFIG[type].titleField]),
      slug: entity.slug ?? null,
      description:
        (entity.description as string | null | undefined) ??
        (entity.summary as string | null | undefined) ??
        null,
      tags: Array.isArray(rawTags) ? (rawTags as string[]) : null,
      categoryName: entity.category?.name ?? null,
    });
  }

  /** 处理分类关联：categoryId 为 null 时置空，为数字时关联对应分类 */
  private async applyCategory(
    type: ContentType,
    entity: ContentRecord,
    dto: ContentDto,
  ) {
    const cfg = this.getConfig(type);
    if (!cfg.hasCategory) return;
    if (dto.categoryId === null) {
      entity.category = null;
    } else if (dto.categoryId !== undefined) {
      const cat = await this.categories.findOne({
        where: { id: Number(dto.categoryId) },
      });
      if (!cat) throw new NotFoundException("分类不存在");
      entity.category = cat;
    }
  }

  private assertStatus(status?: unknown) {
    if (status === undefined) return;
    if (
      typeof status !== "string" ||
      !(CONTENT_STATUSES as readonly string[]).includes(status)
    ) {
      throw new BadRequestException(
        `无效的状态值：${asString(status) || "（非字符串值）"}`,
      );
    }
  }

  /** 校验 DB 必填列（避免 NOT NULL 违例导致裸 500） */
  private assertRequiredFields(type: ContentType, dto: ContentDto) {
    const missing = (REQUIRED_EXTRA[type] ?? []).filter((f) => {
      const v = dto[f];
      return v === undefined || v === null || !asString(v).trim();
    });
    if (missing.length > 0) {
      throw new BadRequestException(`缺少必填字段：${missing.join("、")}`);
    }
  }
}
