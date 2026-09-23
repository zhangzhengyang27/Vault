import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Article } from '../../entities/article.entity';
import { News } from '../../entities/news.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Submission } from '../../entities/submission.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Tool)
    private readonly tools: Repository<Tool>,
    @InjectRepository(Prompt)
    private readonly prompts: Repository<Prompt>,
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    @InjectRepository(News)
    private readonly news: Repository<News>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Post)
    private readonly posts: Repository<Post>,
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    private readonly dataSource: DataSource,
  ) {}

  /** 概览统计：总量 + 待审核数（真实统计，取代硬编码） */
  async stats() {
    const [tools, prompts, articles, news, users, posts, pendingSubmissions] =
      await Promise.all([
        this.tools.count(),
        this.prompts.count(),
        this.articles.count(),
        this.news.count(),
        this.users.count(),
        this.posts.count(),
        this.submissions.count({ where: { status: 'pending' } }),
      ]);

    const pendingContent = await this.countPendingContent();

    return {
      tools,
      prompts,
      articles,
      news,
      users,
      posts,
      pending: pendingSubmissions + pendingContent,
      pendingSubmissions,
      pendingContent,
    };
  }

  /** 近 N 天趋势：每日新增内容与新增用户（SQL 按天分组，避免全表载入内存） */
  async trend(days = 7) {
    // 钳制天数：NaN 回退 7，范围 1~31
    const n = Number.isFinite(days) ? Math.round(days) : 7;
    const safeDays = Math.max(1, Math.min(31, n));

    // 按天分桶全程在 DB 会话时区内完成（generate_series 生成连续日期键、
    // 过滤边界用 now() 推算），Node 侧只消费 SQL 返回的键，
    // 避免 Node 与 Postgres 时区不一致时每日桶漂移
    const dayRows: { d: string }[] = await this.dataSource.query(
      `SELECT to_char(gs, 'YYYY-MM-DD') AS d
         FROM generate_series(
           date_trunc('day', now()) - make_interval(days => $1),
           date_trunc('day', now()),
           interval '1 day'
         ) AS gs`,
      [safeDays - 1],
    );

    // 初始化空桶（保证趋势图连续）
    const bucket = new Map<
      string,
      { date: string; content: number; users: number }
    >();
    for (const r of dayRows) {
      bucket.set(r.d, { date: r.d, content: 0, users: 0 });
    }

    const countByDay = async (repo: Repository<any>, alias: string) => {
      const rows = await repo
        .createQueryBuilder(alias)
        .select(`to_char(${alias}.created_at, 'YYYY-MM-DD')`, 'd')
        .addSelect('COUNT(*)', 'c')
        .where(
          `${alias}.created_at >= date_trunc('day', now()) - make_interval(days => :span)`,
          { span: safeDays - 1 },
        )
        .groupBy('d')
        .getRawMany();
      return rows as { d: string; c: string }[];
    };

    const [contentRows, userRows] = await Promise.all([
      Promise.all([
        countByDay(this.tools, 't'),
        countByDay(this.prompts, 'p'),
        countByDay(this.articles, 'a'),
        countByDay(this.news, 'n'),
      ]),
      countByDay(this.users, 'u'),
    ]);

    for (const tableRows of contentRows) {
      for (const r of tableRows) {
        if (bucket.has(r.d)) bucket.get(r.d)!.content += Number(r.c);
      }
    }
    for (const r of userRows) {
      if (bucket.has(r.d)) bucket.get(r.d)!.users += Number(r.c);
    }

    return [...bucket.values()];
  }

  private async countPendingContent(): Promise<number> {
    const count = async (repo: Repository<any>) =>
      repo.count({ where: { status: 'pending' } });
    const [t, p, a, n] = await Promise.all([
      count(this.tools),
      count(this.prompts),
      count(this.articles),
      count(this.news),
    ]);
    return t + p + a + n;
  }
}
