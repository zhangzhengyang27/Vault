import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Submission } from '../../entities/submission.entity';
import { Comment } from '../../entities/comment.entity';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Article } from '../../entities/article.entity';
import { News } from '../../entities/news.entity';
import { Repo } from '../../entities/repo.entity';
import { Resource } from '../../entities/resource.entity';
import { Mcp } from '../../entities/mcp.entity';
import { Post } from '../../entities/post.entity';
import { Follow } from '../../entities/follow.entity';
import { clampInt } from '../posts/posts.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Tool) private readonly toolRepo: Repository<Tool>,
    @InjectRepository(Prompt) private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(News) private readonly newsRepo: Repository<News>,
    @InjectRepository(Repo) private readonly repoRepo: Repository<Repo>,
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    @InjectRepository(Mcp) private readonly mcpRepo: Repository<Mcp>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
  ) {}

  /** 批量把 (targetType, targetIds) 解析为 id → slug 映射（每类一次 IN 查询） */
  private async resolveSlugs(
    targets: { type: string; ids: number[] }[],
  ): Promise<Map<string, string>> {
    const repoByType: Record<
      string,
      Repository<{ id: number; slug: string }>
    > = {
      tool: this.toolRepo,
      prompt: this.promptRepo,
      article: this.articleRepo,
      news: this.newsRepo,
      repo: this.repoRepo,
      resource: this.resourceRepo,
      mcp: this.mcpRepo,
      // post 没有 slug 列（社区帖子按 id 寻址），不可参与 slug 解析，否则
      // select slug 会抛 EntityPropertyNotFoundError 使公开评论页 500；
      // targetSlug 为 null 时前端按约定回退到 /community 列表页
    };
    const map = new Map<string, string>();
    await Promise.all(
      targets
        .filter((t) => t.ids.length > 0 && repoByType[t.type])
        .map(async (t) => {
          const rows = await repoByType[t.type].find({
            where: { id: In(t.ids) },
            select: { id: true, slug: true },
          });
          for (const r of rows) map.set(`${t.type}:${r.id}`, r.slug);
        }),
    );
    return map;
  }

  /**
   * 推荐关注：按粉丝数倒序的活跃用户，登录时排除自己与已关注者
   */
  async suggested(meId?: number, limit = 5) {
    const safeLimit = clampInt(limit, 5, 20);
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoin('follows', 'f', 'f.following_id = user.id')
      .addSelect('COUNT(f.id)', 'followers')
      .where('user.status = :status', { status: 'active' });
    if (meId) {
      qb.andWhere('user.id != :meId', { meId }).andWhere(
        'user.id NOT IN (SELECT following_id FROM follows WHERE follower_id = :meId)',
        { meId },
      );
    }
    const rows = await qb
      .groupBy('user.id')
      .orderBy('"followers"', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .limit(safeLimit)
      .getRawMany<{
        user_id: number;
        user_username: string;
        user_nickname: string | null;
        user_avatar: string | null;
        user_bio: string | null;
        followers: number | string;
      }>();
    return rows.map((r) => ({
      id: Number(r.user_id),
      username: r.user_username,
      nickname: r.user_nickname,
      avatar: r.user_avatar,
      bio: r.user_bio,
      followers: Number(r.followers ?? 0),
    }));
  }

  /**
   * 按用户名获取用户公开信息（不返回 email/passwordHash 等敏感字段）
   */
  async findByUsername(username: string) {
    const user = await this.userRepo.findOne({
      where: { username },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const [submissions, comments, posts, followers, following] =
      await Promise.all([
        this.submissionRepo.count({ where: { userId: user.id } }),
        this.commentRepo.count({ where: { user: { id: user.id } } }),
        this.postRepo.count({
          where: { user: { id: user.id }, status: 'published' },
        }),
        this.followRepo.count({ where: { followingId: user.id } }),
        this.followRepo.count({ where: { followerId: user.id } }),
      ]);
    // 获赞 = 该用户已发布帖子的 likes 之和
    const likesRow = await this.postRepo
      .createQueryBuilder('post')
      .select('COALESCE(SUM(post.likes), 0)', 'total')
      .where('post.user_id = :id', { id: user.id })
      .andWhere('post.status = :status', { status: 'published' })
      .getRawOne<{ total: number | string }>();
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        posts,
        submissions,
        comments,
        followers,
        following,
        likesReceived: Number(likesRow?.total ?? 0),
      },
    };
  }

  /**
   * 获取用户的提交列表（公开，只返回已通过的）
   */
  async getUserSubmissions(username: string, page = 1, limit = 20) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const [items, total] = await this.submissionRepo.findAndCount({
      where: { userId: user.id, status: 'approved' },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    // 解析发布内容 slug：详情路由按 slug 寻址，直接拼 contentId 会 404
    const slugMap = await this.resolveSlugs(
      Object.entries(
        items.reduce<Record<string, number[]>>((acc, s) => {
          if (s.contentId) (acc[s.type] ??= []).push(s.contentId);
          return acc;
        }, {}),
      ).map(([type, ids]) => ({ type, ids })),
    );
    return {
      items: items.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        description: s.description,
        url: s.url,
        status: s.status,
        contentId: s.contentId,
        slug: s.contentId
          ? (slugMap.get(`${s.type}:${s.contentId}`) ?? null)
          : null,
        createdAt: s.createdAt,
      })),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * 获取用户的评论列表（公开）
   */
  async getUserComments(username: string, page = 1, limit = 20) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const [items, total] = await this.commentRepo.findAndCount({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    const slugMap = await this.resolveSlugs(
      Object.entries(
        items.reduce<Record<string, number[]>>((acc, c) => {
          if (c.targetType && c.targetId != null) {
            (acc[c.targetType] ??= []).push(c.targetId);
          }
          return acc;
        }, {}),
      ).map(([type, ids]) => ({ type, ids })),
    );
    return {
      items: items.map((c) => ({
        id: c.id,
        content: c.content,
        rating: c.rating,
        targetType: c.targetType,
        targetId: c.targetId,
        targetSlug:
          c.targetType && c.targetId != null
            ? (slugMap.get(`${c.targetType}:${c.targetId}`) ?? null)
            : null,
        createdAt: c.createdAt,
      })),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * 用户的公开帖子列表（个人中心/他人主页「帖子」tab 用）
   */
  async getUserPosts(username: string, page = 1, limit = 20) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const [items, total] = await this.postRepo.findAndCount({
      where: { user: { id: user.id }, status: 'published' },
      order: { id: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.content.slice(0, 120),
        likes: p.likes,
        comments: p.comments,
        createdAt: p.createdAt,
      })),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
