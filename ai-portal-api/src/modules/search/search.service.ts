import { Injectable } from '@nestjs/common';
import { escapeLike, LIKE_ESCAPE_SQL } from '../../common/like.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Article } from '../../entities/article.entity';
import { News } from '../../entities/news.entity';
import { Repo } from '../../entities/repo.entity';
import { Mcp } from '../../entities/mcp.entity';
import { Resource } from '../../entities/resource.entity';

interface SearchRow {
  slug: string;
  name: string;
  desc: string;
  sim: number;
  /** article 专用：所属知识库名，用于拼 /knowledge/{kb}?doc={slug} 链接 */
  kb?: string;
}

@Injectable()
export class SearchService {
  constructor(
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
  ) {}

  /**
   * 全文模糊搜索：使用 pg_trgm 相似度排序，比纯 ILIKE 结果更相关。
   * 依赖已创建的 gin_trgm_ops GIN 索引，可走索引而非全表扫描。
   */
  async search(q: string) {
    const keyword = (q ?? '').trim();
    if (!keyword || keyword.length < 2) {
      return [];
    }

    const like = `%${escapeLike(keyword)}%`;
    // mcps 表同时存 MCP 与 Agent Skill（type 列区分），
    // 两类路由前缀不同（/mcp 与 /skills），必须分两次查询分别打标
    const [tools, prompts, articles, news, repos, mcps, skills, resources] =
      await Promise.all([
        this.searchTable(
          this.tools,
          'tool',
          'name',
          'description',
          like,
          keyword,
        ),
        this.searchTable(
          this.prompts,
          'prompt',
          'title',
          'description',
          like,
          keyword,
        ),
        this.searchTable(
          this.articles,
          'article',
          'title',
          'summary',
          like,
          keyword,
          [{ column: 'knowledgeBase', alias: 'kb' }],
        ),
        this.searchTable(this.news, 'news', 'title', 'summary', like, keyword),
        this.searchTable(
          this.repos,
          'repo',
          'name',
          'description',
          like,
          keyword,
        ),
        this.searchTable(
          this.mcps,
          'mcp',
          'name',
          'description',
          like,
          keyword,
          [],
          'mcp',
        ),
        this.searchTable(
          this.mcps,
          'mcp',
          'name',
          'description',
          like,
          keyword,
          [],
          'skill',
        ),
        this.searchTable(
          this.resources,
          'resource',
          'title',
          'description',
          like,
          keyword,
        ),
      ]);

    const typeMap: Record<string, { type: string; hrefPrefix: string }> = {
      tool: { type: '工具', hrefPrefix: '/tools' },
      prompt: { type: '提示词', hrefPrefix: '/prompts' },
      article: { type: '知识库', hrefPrefix: '/knowledge' },
      news: { type: '资讯', hrefPrefix: '/news' },
      repo: { type: '开源', hrefPrefix: '/github' },
      mcp: { type: 'MCP', hrefPrefix: '/mcp' },
      skill: { type: 'Skill', hrefPrefix: '/skills' },
      resource: { type: '资源', hrefPrefix: '/resources' },
    };

    const all: { row: SearchRow; kind: string }[] = [];
    for (const [kind, rows] of Object.entries({
      tool: tools,
      prompt: prompts,
      article: articles,
      news: news,
      repo: repos,
      mcp: mcps,
      skill: skills,
      resource: resources,
    })) {
      for (const row of rows) all.push({ row, kind });
    }
    // 全局按相似度降序，相关度高的排前面
    all.sort((a, b) => b.row.sim - a.row.sim);

    return all.slice(0, 50).map(({ row, kind }) => {
      const meta = typeMap[kind];
      // 知识库文章的阅读路由是 /knowledge/{知识库名}?doc={slug}，
      // 直接拼 /knowledge/{slug} 会被当成不存在的知识库
      const href =
        kind === 'article' && row.kb
          ? `/knowledge/${encodeURIComponent(row.kb)}?doc=${encodeURIComponent(row.slug)}`
          : `${meta.hrefPrefix}/${row.slug}`;
      return {
        type: meta.type,
        name: row.name,
        desc: row.desc,
        slug: row.slug,
        href,
      };
    });
  }

  private async searchTable(
    repo: Repository<any>,
    alias: string,
    titleCol: string,
    descCol: string,
    like: string,
    keyword: string,
    extra: { column: string; alias: string }[] = [],
    /** mcps 表同存 MCP 与 Skill，按 type 列过滤分流 */
    typeFilter?: string,
  ): Promise<SearchRow[]> {
    const qb = repo.createQueryBuilder(alias);
    // 全部接入状态机的表都必须过滤已发布内容，否则采集/同步入库的
    // pending/rejected 条目会经公开搜索接口泄露（repo/mcp 也有 status 列）
    const hasStatus = [
      'tool',
      'prompt',
      'article',
      'news',
      'repo',
      'mcp',
      'resource',
    ].includes(alias);
    if (hasStatus) {
      qb.andWhere(`${alias}.status = :status`, { status: 'published' });
    }
    if (typeFilter) {
      qb.andWhere(`${alias}.type = :${alias}_type`, {
        [`${alias}_type`]: typeFilter,
      });
    }
    qb.andWhere(
      `(${alias}.${titleCol} ILIKE :like OR ${alias}.${descCol} ILIKE :like${LIKE_ESCAPE_SQL})`,
      { like },
    );
    // 用 pg_trgm 相似度计算排序分（标题权重高于描述）
    qb.addSelect(
      `LEAST(1, similarity(${alias}.${titleCol}, :kw) * 1.5 + similarity(${alias}.${descCol}, :kw) * 0.5)`,
      'sim',
    );
    qb.setParameter('kw', keyword);
    qb.orderBy('sim', 'DESC');
    qb.limit(10);
    for (const e of extra) {
      qb.addSelect(`${alias}.${e.column}`, e.alias);
    }
    // getRawMany 返回的是带 `${别名}_${列名}` 前缀的裸行；
    // 显式别名的 addSelect 在部分 TypeORM 版本下不带前缀，两种取法都兼容
    const raw = await qb.getRawMany<Record<string, unknown>>();
    return raw.map((r) => ({
      slug: r[`${alias}_slug`] as string,
      name: r[`${alias}_${titleCol}`] as string,
      desc: r[`${alias}_${descCol}`] as string,
      sim: Number(r.sim) || 0,
      kb:
        (r[`${alias}_kb`] as string | undefined) ??
        (r['kb'] as string | undefined) ??
        undefined,
    }));
  }
}
