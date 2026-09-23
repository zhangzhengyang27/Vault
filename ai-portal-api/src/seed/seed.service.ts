import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Tool } from '../entities/tool.entity';
import { Prompt } from '../entities/prompt.entity';
import { Article } from '../entities/article.entity';
import { News } from '../entities/news.entity';
import { Repo } from '../entities/repo.entity';
import { Mcp } from '../entities/mcp.entity';
import { Resource } from '../entities/resource.entity';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { Source, SourceType } from '../entities/source.entity';
import * as bcrypt from 'bcryptjs';

import categoriesJson from './data/categories.json';
import sourcesJson from './data/sources.json';
import toolsJson from './data/tools.json';
import promptsJson from './data/prompts.json';
import newsJson from './data/news.json';
import reposJson from './data/repos.json';
import mcpsJson from './data/mcps.json';
import skillsJson from './data/skills.json';
import resourcesJson from './data/resources.json';
import postsJson from './data/posts.json';
import { classifyNewsCategory } from '../modules/news/news-categories';

/** 自动采集管道默认数据源（白名单），可在管理后台增删改 */
export type SourceSeed = {
  name: string;
  url: string;
  sourceType: SourceType;
  crawlInterval: string;
  description: string;
};

export interface CategorySeed {
  slug: string;
  name: string;
}

/** 带 categorySlug 的种子：落库前会把 categorySlug 换成 category 实体关联 */
export interface WithCategorySlug {
  slug: string;
  categorySlug: string;
  [field: string]: unknown;
}

/** 带 slug 唯一键的种子记录（启动时按 slug 判重，「只插不改」） */
export interface SluggedSeed {
  slug: string;
  [field: string]: unknown;
}

/** 帖子种子无 slug，以 title 为唯一键 */
export interface TitledSeed {
  title: string;
  [field: string]: unknown;
}

/** MCP 与 Skills 种子字段（统一落 mcps 表） */
export interface McpSeed {
  slug: string;
  name: string;
  description?: string;
  endpoint?: string;
  type?: string;
  tags?: string[];
  phase?: string;
  [field: string]: unknown;
}

/**
 * 种子数据外置为 JSON（见 ./data/*.json）。
 * 此前这些数组内联在本文件，约 3700 行数据把 150 行播种逻辑完全淹没，
 * 既不便于 review，也让运营无法直接改动内容。
 */
const CATEGORIES = categoriesJson as CategorySeed[];
const SOURCE_SEED = sourcesJson as SourceSeed[];
const TOOL_SEED = toolsJson as WithCategorySlug[];
const PROMPT_SEED = promptsJson as WithCategorySlug[];
const NEWS_SEED = newsJson as SluggedSeed[];
const REPO_SEED = reposJson as SluggedSeed[];
const MCP_SEED = mcpsJson as McpSeed[];
const SKILL_SEED = skillsJson as McpSeed[];
const RESOURCE_SEED = resourcesJson as SluggedSeed[];
const POST_SEED = postsJson as TitledSeed[];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Tool)
    private readonly tools: Repository<Tool>,
    @InjectRepository(Prompt)
    private readonly prompts: Repository<Prompt>,
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    @InjectRepository(News)
    private readonly news: Repository<News>,
    @InjectRepository(Repo)
    private readonly repos: Repository<Repo>,
    @InjectRepository(Mcp)
    private readonly mcps: Repository<Mcp>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    @InjectRepository(Post)
    private readonly posts: Repository<Post>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Source)
    private readonly sources: Repository<Source>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking seed data…');

    const categoryMap = new Map<string, Category>();
    const existingCategories = await this.categories.find();
    for (const c of existingCategories) {
      categoryMap.set(c.slug, c);
    }
    for (const c of CATEGORIES) {
      if (!categoryMap.has(c.slug)) {
        const saved = await this.categories.save(this.categories.create(c));
        categoryMap.set(c.slug, saved);
      }
    }

    // 按需查询是否存在，避免启动时全表加载（数据量大时显著降低内存与启动时间）
    for (const t of TOOL_SEED) {
      const { categorySlug, ...rest } = t;
      const exists = await this.tools.findOne({ where: { slug: rest.slug } });
      if (!exists) {
        await this.tools.save(
          this.tools.create({
            ...rest,
            tags: (rest.tags as string[] | undefined) ?? [],
            category: categoryMap.get(categorySlug) ?? null,
          }),
        );
      }
    }

    for (const p of PROMPT_SEED) {
      const { categorySlug, ...rest } = p;
      const exists = await this.prompts.findOne({ where: { slug: rest.slug } });
      if (!exists) {
        await this.prompts.save(
          this.prompts.create({
            ...rest,
            category: categoryMap.get(categorySlug) ?? null,
          }),
        );
      }
    }

    // 文章不做种子：知识库内容由导入/管理流程维护，避免空心示例文章反复复活。
    // 原 ARTICLE_SEED 数据（约 270 行）与其播种循环已作为死代码一并移除。

    for (const n of NEWS_SEED) {
      const exists = await this.news.findOne({ where: { slug: n.slug } });
      if (!exists) {
        // 写入时打分类标（与爬虫/后台路径共用同一套规则）
        const title = typeof n.title === 'string' ? n.title : '';
        const summary = typeof n.summary === 'string' ? n.summary : '';
        await this.news.save(
          this.news.create({
            ...n,
            category: classifyNewsCategory({ title, summary }),
          }),
        );
      }
    }

    for (const r of REPO_SEED) {
      const exists = await this.repos.findOne({ where: { slug: r.slug } });
      if (!exists) {
        await this.repos.save(this.repos.create(r));
      }
    }

    // MCP 与 Skills 统一走 mcps 表：与其他种子一致采用「只插不改」——
    // 覆盖式 upsert 会在每次启动时把管理员对种子条目的编辑静默还原
    const seedMcps: McpSeed[] = [...MCP_SEED, ...SKILL_SEED];
    for (const m of seedMcps) {
      const exists = await this.mcps.findOne({ where: { slug: m.slug } });
      if (!exists) {
        await this.mcps.save(this.mcps.create({ ...m, type: m.type ?? 'mcp' }));
      }
    }

    for (const r of RESOURCE_SEED) {
      const exists = await this.resources.findOne({ where: { slug: r.slug } });
      if (!exists) {
        await this.resources.save(this.resources.create(r));
      }
    }

    for (const p of POST_SEED) {
      const exists = await this.posts.findOne({ where: { title: p.title } });
      if (!exists) {
        await this.posts.save(this.posts.create(p));
      }
    }

    // 演示管理员账号仅在显式开启时创建（SEED_DEMO=true），且不会在启动时把已降级的
    // demo 账号悄悄提回 admin——否则任何部署空库即等于开放已知口令的管理后台。
    // 生产环境（NODE_ENV=production）一律拒绝，防止误配把已知口令账号带上线
    if (
      process.env.SEED_DEMO === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      if ((await this.users.count()) === 0) {
        await this.users.save(
          this.users.create({
            username: 'demo',
            email: 'demo@example.com',
            passwordHash: await bcrypt.hash('demo1234', 10),
            role: 'admin',
          }),
        );
        this.logger.log(
          '已创建演示管理员 demo（SEED_DEMO=true，请尽快修改密码）',
        );
      }
    }

    // 自动采集管道默认数据源（不存在时才写入）
    for (const s of SOURCE_SEED) {
      const exists = await this.sources.findOne({ where: { name: s.name } });
      if (!exists) {
        await this.sources.save(this.sources.create(s));
      }
    }

    this.logger.log('Seed check completed.');
  }
}
