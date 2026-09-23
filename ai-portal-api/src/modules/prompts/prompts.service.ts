import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets } from "typeorm";
import { Prompt } from "../../entities/prompt.entity";
import { Category } from "../../entities/category.entity";
import {
  getImageDimensions,
  urlToLocalPath,
} from "../../common/image-dimensions";
import { CreatePromptDto } from "./dto/create-prompt.dto";
import { ContentCleanupService } from "../../common/content-cleanup.service";
import { escapeLike, LIKE_ESCAPE_SQL } from "../../common/like.util";
import { classifyContentCategory } from "../../common/content-category";

export interface PromptQuery {
  kind?: string;
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  sort?: string;
  media?: "image" | "text";
}

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(Prompt)
    private readonly repo: Repository<Prompt>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: PromptQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    // 图片/文字瀑布流前端会批量拉取较多数据做本地筛选，故上限大于其他列表；
    // 单请求开销已通过图片尺寸缓存（见 image-dimensions）显著降低。
    const limit = Math.min(1000, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    // QueryBuilder 不会自动加载 eager 关联，需显式 join 才能让列表卡片拿到分类名
    const qb = this.repo
      .createQueryBuilder("prompt")
      .leftJoinAndSelect("prompt.category", "category");

    // 公开接口默认只返回已发布内容
    qb.andWhere("prompt.status = :status", { status: "published" });

    if (query.kind) {
      qb.andWhere("prompt.kind = :kind", { kind: query.kind });
    }
    if (query.category) {
      // OR 条件必须用 Brackets 包裹，否则与 status 条件拼接后优先级错误，
      // 会把「分类匹配但未发布」的内容泄露进公开列表
      qb.andWhere(
        new Brackets((w) => {
          w.where("category.name = :cat", { cat: query.category }).orWhere(
            "category.slug = :cat",
            { cat: query.category },
          );
        }),
      );
    }
    if (query.media === "image") {
      // 图片模式:至少有一个图片附件
      qb.andWhere(
        `prompt.attachments IS NOT NULL AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(prompt.attachments) att
           WHERE att->>'type' = 'image'
         )`,
      );
    } else if (query.media === "text") {
      // 文字模式:排除含多媒体附件(图/视频/音频)的条目;
      // link 附件(在线演示)不算媒体,挂了演示链接的文字提示词仍属本页,
      // 否则「网页生成」分类会因补挂演示链接而从列表整体消失。
      // 注意:条件含 OR,必须用 Brackets 包裹——裸字符串 andWhere 不加括号,
      // OR 会逃逸到顶层把 status/kind/category 过滤全部短路(同分类筛选的前车之鉴)
      qb.andWhere(
        new Brackets((w) => {
          w.where("prompt.attachments IS NULL").orWhere(
            `NOT EXISTS (
               SELECT 1 FROM jsonb_array_elements(prompt.attachments) att
               WHERE att->>'type' IN ('image', 'video', 'audio')
             )`,
          );
        }),
      );
    }
    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where("prompt.title ILIKE :q" + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          })
            .orWhere("prompt.description ILIKE :q" + LIKE_ESCAPE_SQL, {
              q: `%${escapeLike(query.q)}%`,
            })
            .orWhere("prompt.content ILIKE :q" + LIKE_ESCAPE_SQL, {
              q: `%${escapeLike(query.q)}%`,
            });
        }),
      );
    }

    // precise 页以图片示例为主：带图 prompt 排在前
    // 注意：用 addSelect 注册为查询别名再 orderBy 别名，避免 TypeORM 把原始
    // CASE 表达式误解析为别名（带 JOIN 的分类筛选会因此 500）。
    if (query.kind === "precise") {
      qb.addSelect(
        `CASE WHEN prompt.attachments IS NOT NULL AND jsonb_array_length(prompt.attachments) > 0 THEN 0 ELSE 1 END`,
        "img_order",
      ).orderBy("img_order", "ASC");
    }

    switch (query.sort) {
      case "uses":
        qb.addOrderBy("prompt.uses", "DESC");
        break;
      case "newest":
        qb.addOrderBy("prompt.createdAt", "DESC");
        break;
      default:
        qb.addOrderBy("prompt.id", "ASC");
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    // 为图片附件附带宽高信息，前端瀑布流按真实比例预留空间消除 CLS
    const enriched = await Promise.all(
      items.map(async (item) => {
        if (!item.attachments) return item;
        const enrichedAttachments = await Promise.all(
          item.attachments.map(async (att) => {
            if (att.type !== "image") return att;
            const localPath = urlToLocalPath(att.url);
            if (!localPath) return att;
            const dim = await getImageDimensions(localPath);
            return dim ? { ...att, width: dim.width, height: dim.height } : att;
          }),
        );
        return { ...item, attachments: enrichedAttachments };
      }),
    );

    // 列表接口不返回完整 content 和 optimizedContent，减少传输量；
    // 内容分类由服务端算好随列表项下发（前端拿不到 content 无法自行分类）
    const itemsWithoutContent = enriched.map(
      ({ content, optimizedContent, ...rest }) => ({
        ...rest,
        contentCategory: classifyContentCategory(content),
      }),
    );

    return {
      items: itemsWithoutContent,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      facets: [],
    };
  }

  async findOne(slug: string) {
    // 公开详情只返回已发布内容（draft/pending/rejected 不可匿名直达）
    const entity = await this.repo.findOne({
      where: { slug, status: "published" },
    });
    if (!entity) throw new NotFoundException("提示词不存在或未发布");
    return entity;
  }

  /** 复制提示词时计入一次使用。公开端点只做计数自增，须命中已发布内容 */
  async use(slug: string) {
    const prompt = await this.repo.findOne({
      where: { slug, status: "published" },
    });
    if (!prompt) throw new NotFoundException("提示词不存在或未发布");
    await this.repo.increment({ id: prompt.id }, "uses", 1);
    return { uses: prompt.uses + 1 };
  }

  async create(dto: CreatePromptDto) {
    const { categoryId, ...rest } = dto;
    const prompt = this.repo.create(rest);
    // 通过该接口创建的均为用户手动创建的提示词
    prompt.source = "manual";
    if (categoryId) {
      prompt.category =
        (await this.categories.findOneBy({ id: categoryId })) ?? null;
    }
    return this.repo.save(prompt);
  }

  async update(slug: string, dto: Partial<CreatePromptDto>) {
    const prompt = await this.repo.findOne({ where: { slug } });
    if (!prompt) throw new NotFoundException("提示词不存在");
    const { categoryId, ...rest } = dto;
    Object.assign(prompt, rest);
    if (categoryId !== undefined) {
      prompt.category =
        (await this.categories.findOneBy({ id: categoryId })) ?? null;
    }
    // slug 变更：先查重（唯一约束冲突裸 500 → 409），保存后同步
    // favorites/notifications 的 targetSlug 快照，避免收藏/通知跳转 404
    const oldSlug = prompt.slug;
    if (rest.slug && rest.slug !== oldSlug) {
      const exists = await this.repo.findOne({ where: { slug: rest.slug } });
      if (exists) throw new ConflictException(`slug 已被占用: ${rest.slug}`);
    }
    let saved: Prompt;
    try {
      saved = await this.repo.save(prompt);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        throw new ConflictException(`slug 已被占用: ${rest.slug}`);
      }
      throw err;
    }
    if (rest.slug && rest.slug !== oldSlug) {
      await this.cleanup.syncSlug("prompt", prompt.id, rest.slug);
    }
    return saved;
  }
  async remove(slug: string) {
    const prompt = await this.repo.findOne({ where: { slug } });
    if (!prompt) throw new NotFoundException("提示词不存在");
    await this.repo.remove(prompt);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge("prompt", prompt.id);
    return prompt;
  }
}
