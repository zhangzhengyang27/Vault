import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Article } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { KnowledgeBaseMeta } from '../../entities/knowledge-base.entity';
import { Tool } from '../../entities/tool.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { ContentCleanupService } from '../../common/content-cleanup.service';
import { escapeLike, LIKE_ESCAPE_SQL } from '../../common/like.util';
import { extractUrlHosts, websiteHost } from '../../common/url-hosts';

/** getKnowledgeBases：按知识库聚合的统计行（Postgres COUNT(*) 经 raw query 返回字符串） */
interface KnowledgeBaseStatsRow {
  name: string;
  count: string | number;
  lastUpdated: string | Date;
}

/** getKnowledgeBases：各知识库下的分类名行 */
interface KnowledgeBaseCategoryRow {
  kb: string | null;
  cat: string | null;
}

export interface ArticleQuery {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  sort?: string;
  knowledgeBase?: string;
}

/**
 * getKnowledgeBases 用 COALESCE 把 knowledge_base 为 NULL 的文章聚合成这个桶名。
 * findAll 按知识库过滤时必须把该桶名翻译成 IS NULL，否则对应知识库页永远查空。
 */
export const DEFAULT_KB_NAME = '通用文章';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly repo: Repository<Article>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(KnowledgeBaseMeta)
    private readonly kbMeta: Repository<KnowledgeBaseMeta>,
    @InjectRepository(Tool)
    private readonly tools: Repository<Tool>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: ArticleQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('article');
    qb.leftJoinAndSelect('article.category', 'category');

    // 公开接口默认只返回已发布内容
    qb.andWhere('article.status = :status', { status: 'published' });

    if (query.category) {
      // OR 条件必须用 Brackets 包裹：裸拼接会因 AND 优先级高于 OR 变成
      // (published AND name) OR slug，把「分类匹配但未发布」的文章泄露进公开列表
      qb.andWhere(
        new Brackets((w) => {
          w.where('category.name = :cat', { cat: query.category }).orWhere(
            'category.slug = :cat',
            { cat: query.category },
          );
        }),
      );
    }
    if (query.knowledgeBase) {
      if (query.knowledgeBase === DEFAULT_KB_NAME) {
        qb.andWhere('article.knowledgeBase IS NULL');
      } else {
        qb.andWhere('article.knowledgeBase = :kb', { kb: query.knowledgeBase });
      }
    }
    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('article.title ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          }).orWhere('article.summary ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          });
        }),
      );
    }

    switch (query.sort) {
      case 'newest':
        qb.orderBy('article.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('article.id', 'ASC');
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
      where: { slug, status: 'published' },
    });
    if (!entity) throw new NotFoundException('文章不存在或未发布');
    return entity;
  }

  async getKnowledgeBases() {
    const raw = await this.repo
      .createQueryBuilder('article')
      .select('COALESCE(article.knowledge_base, :default)', 'name')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(article.updated_at)', 'lastUpdated')
      .where('article.status = :status', { status: 'published' })
      .groupBy('COALESCE(article.knowledge_base, :default)')
      .setParameter('default', DEFAULT_KB_NAME)
      .getRawMany<KnowledgeBaseStatsRow>();
    const agg = raw.map((r) => ({
      name: r.name,
      count: Number(r.count),
      lastUpdated: r.lastUpdated,
    }));

    // 元数据（描述/学习路径/排序）与各知识库下的分类标签
    // chips 按分类 sortOrder 排序，保证学习路径库的标签顺序与课程顺序一致
    const [metas, catRows] = await Promise.all([
      this.kbMeta.find(),
      this.repo
        .createQueryBuilder('article')
        .select('article.knowledge_base', 'kb')
        .addSelect('category.name', 'cat')
        .innerJoin('article.category', 'category')
        .where('article.status = :status', { status: 'published' })
        .andWhere('article.knowledge_base IS NOT NULL')
        .groupBy('article.knowledge_base')
        .addGroupBy('category.name')
        .addGroupBy('category.sortOrder')
        .orderBy('category.sortOrder', 'ASC')
        .getRawMany<KnowledgeBaseCategoryRow>(),
    ]);
    const metaByName = new Map(metas.map((m) => [m.name, m]));
    const catsByKb = new Map<string, string[]>();
    for (const r of catRows) {
      if (!r.kb || !r.cat) continue;
      const list = catsByKb.get(r.kb) ?? [];
      list.push(r.cat);
      catsByKb.set(r.kb, list);
    }

    const items = agg.map((a) => {
      const meta = metaByName.get(a.name);
      return {
        ...a,
        description: meta?.description ?? null,
        isPath: meta?.isPath ?? false,
        categories: catsByKb.get(a.name) ?? [],
      };
    });
    // 有元数据的按 sort_order 置前，其余按文档数排序
    items.sort((x, y) => {
      const mx = metaByName.get(x.name);
      const my = metaByName.get(y.name);
      if (mx && my) return (mx.sortOrder ?? 0) - (my.sortOrder ?? 0);
      if (mx) return -1;
      if (my) return 1;
      return y.count - x.count;
    });
    return items;
  }

  /** 文章正文中提到的工具（按链接主机名与 tools.website 匹配） */
  async getRelatedTools(slug: string) {
    // 只对已发布文章生效：否则该接口会成为未发布文章的存在性 oracle
    // （可借响应是否为空探测草稿 slug 及其正文提到的工具）
    const article = await this.repo.findOne({
      where: { slug, status: 'published' },
      select: { id: true, slug: true, content: true },
    });
    if (!article?.content) return [];
    const hosts = new Set(extractUrlHosts(article.content));
    if (hosts.size === 0) return [];

    const candidates = await this.tools.find({
      where: { status: 'published' },
    });
    const seen = new Set<string>();
    const matched: Tool[] = [];
    for (const tool of candidates.sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (!tool.website || matched.length >= 8) continue;
      const host = websiteHost(tool.website);
      if (!host || seen.has(host) || !hosts.has(host)) continue;
      seen.add(host);
      matched.push(tool);
    }
    return matched.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      website: t.website,
      category: t.category ? { name: t.category.name } : null,
    }));
  }

  async create(dto: CreateArticleDto) {
    const { categoryId, ...rest } = dto;
    const article = this.repo.create(rest);
    if (categoryId) {
      article.category =
        (await this.categories.findOneBy({ id: categoryId })) ?? null;
    }
    return this.repo.save(article);
  }

  async update(slug: string, dto: Partial<CreateArticleDto>) {
    const article = await this.repo.findOne({ where: { slug } });
    if (!article) throw new NotFoundException('文章不存在');
    const { categoryId, ...rest } = dto;
    Object.assign(article, rest);
    if (categoryId !== undefined) {
      article.category =
        (await this.categories.findOneBy({ id: categoryId })) ?? null;
    }
    // slug 变更：先查重（唯一约束冲突裸 500 → 409），保存后同步
    // favorites/notifications 的 targetSlug 快照，避免收藏/通知跳转 404
    const oldSlug = article.slug;
    if (rest.slug && rest.slug !== oldSlug) {
      const exists = await this.repo.findOne({ where: { slug: rest.slug } });
      if (exists) throw new ConflictException(`slug 已被占用: ${rest.slug}`);
    }
    let saved: Article;
    try {
      saved = await this.repo.save(article);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(`slug 已被占用: ${rest.slug}`);
      }
      throw err;
    }
    if (rest.slug && rest.slug !== oldSlug) {
      await this.cleanup.syncSlug('article', article.id, rest.slug);
    }
    return saved;
  }
  async remove(slug: string) {
    const article = await this.repo.findOne({ where: { slug } });
    if (!article) throw new NotFoundException('文章不存在');
    await this.repo.remove(article);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge('article', article.id);
    return article;
  }
}
