import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { PostLike } from '../../entities/post-like.entity';
import { User } from '../../entities/user.entity';
import { ContentCleanupService } from '../../common/content-cleanup.service';
import { isPgErrorWithCode } from '../../common/pg-error';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto } from './dto/create-post.dto';

/** 整数参数钳制：非法输入回退默认值（避免 NaN 直达 SQL） */
export function clampInt(
  value: number | string,
  fallback: number,
  max: number,
  min = 1,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly repo: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
    private readonly cleanup: ContentCleanupService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(
    page: number | string = 1,
    limit: number | string = 20,
    sort: string = 'latest',
    tag?: string,
  ) {
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const qb = this.repo
      .createQueryBuilder('post')
      .leftJoinAndMapOne(
        'post.user',
        User,
        'author',
        'author.id = post.user_id',
      )
      .where('post.status = :status', { status: 'published' });
    if (tag) {
      // 标签筛选：simple-array 逗号串的包含匹配（小数据量足够，避免引入多对多）
      const escaped = tag.replace(/[%_\\]/g, '\\$&');
      qb.andWhere('post.tags ILIKE :tag', { tag: `%${escaped}%` });
    }
    if (sort === 'hot') {
      qb.orderBy('post.likes', 'DESC').addOrderBy('post.id', 'DESC');
    } else {
      qb.orderBy('post.id', 'DESC');
    }
    qb.skip((safePage - 1) * safeLimit).take(safeLimit);
    const [items, total] = await qb.getManyAndCount();
    return {
      // 只透出作者 userId（前端判断能否删帖），不泄露 User 实体其余字段
      items: items.map(({ user, ...rest }) => ({
        ...rest,
        userId: user?.id ?? null,
        author: user
          ? {
              id: user.id,
              username: user.username,
              nickname: user.nickname,
              avatar: user.avatar,
            }
          : null,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /** 标签规范化：trim → 剔除逗号（防 simple-array 序列化被拆分）→ 去空 → 去重 → 截断 5 个 */
  private normalizeTags(tags?: string[]): string[] | null {
    if (!tags?.length) return null;
    const cleaned = [
      ...new Set(
        tags.map((t) => t.trim().replace(/[,，]/g, '')).filter(Boolean),
      ),
    ];
    return cleaned.length ? cleaned.slice(0, 5) : null;
  }

  create(dto: CreatePostDto, user?: { id: number; username: string }) {
    return this.repo.save(
      this.repo.create({
        title: this.stripHtml(dto.title),
        content: this.stripHtml(dto.content),
        // 登录用户一律以账号用户名署名，忽略客户端传入的 authorName（防冒名）
        authorName: user?.username ?? '匿名',
        // TypeORM 只需 id 即可建立关联，无需加载完整 User 实体
        user: user ? { id: user.id } : null,
        tags: this.normalizeTags(dto.tags),
      }),
    );
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * 公开帖子详情：仅 published；每次公开访问阅读数 +1（count=0 跳过，编辑页加载用）；
   * 透出 userId/作者/标签
   */
  async findOnePublic(id: number, countView = true) {
    const item = await this.repo.findOne({
      where: { id, status: 'published' },
      relations: { user: true },
    });
    if (!item) return null;
    // 阅读数原子自增（无需去重，与参考站口径一致）；失败不影响阅读
    if (countView) {
      await this.repo.increment({ id }, 'views', 1).catch(() => undefined);
    }
    const { user, ...rest } = item;
    return {
      ...rest,
      userId: user?.id ?? null,
      author: user
        ? {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
          }
        : null,
    };
  }

  /** 编辑帖子：仅作者本人或管理员；返回更新后的公开详情 */
  async update(
    id: number,
    dto: CreatePostDto,
    user?: { id: number; role?: string },
  ) {
    const post = await this.repo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!post) throw new NotFoundException('帖子不存在');
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (!user || !post.user || post.user.id !== user.id)) {
      throw new ForbiddenException('无权编辑此帖子');
    }
    post.title = this.stripHtml(dto.title);
    post.content = this.stripHtml(dto.content);
    post.tags = this.normalizeTags(dto.tags);
    await this.repo.save(post);
    return { success: true };
  }

  /** 点赞/取消赞（幂等切换），返回最新状态与计数；点赞时通知作者 */
  async toggleLike(postId: number, user: { id: number; username: string }) {
    const userId = user.id;
    const post = await this.repo.findOne({
      where: { id: postId },
      relations: { user: true },
    });
    if (!post) throw new NotFoundException('帖子不存在');

    const existing = await this.likeRepo.findOne({
      where: { post: { id: postId }, user: { id: userId } },
    });
    if (existing) {
      // 条件删除并按 affected 行数回减，防止并发 unlike 双减计数漂移
      const del = await this.likeRepo.delete({
        post: { id: postId },
        user: { id: userId },
      });
      if ((del.affected ?? 0) > 0) {
        await this.repo.decrement({ id: postId }, 'likes', 1);
        return { liked: false, likes: Math.max(0, post.likes - 1) };
      }
      return { liked: false, likes: post.likes };
    }
    try {
      await this.likeRepo.save(
        this.likeRepo.create({
          post: { id: postId } as DeepPartial<Post>,
          user: { id: userId } as DeepPartial<User>,
        }),
      );
    } catch (err) {
      // 并发双击：唯一约束命中说明对方请求已插入且已 increment，
      // 直接返回避免重复 +1 造成计数永久漂移
      if (!isPgErrorWithCode(err, '23505')) {
        throw err;
      }
      return { liked: true, likes: post.likes + 1 };
    }
    await this.repo.increment({ id: postId }, 'likes', 1);
    // 点赞通知作者：匿名帖、自己赞自己不通知
    if (post.user && post.user.id !== userId) {
      await this.notifications.createForUser(post.user.id, {
        type: 'like',
        title: `${user.username} 赞了你的帖子「${post.title}」`,
        targetType: 'post',
        targetId: postId,
      });
    }
    return { liked: true, likes: post.likes + 1 };
  }

  /** 查询用户对一批帖子的点赞状态（前端列表渲染用；IN 查询避免全量拉取） */
  async likedPostIds(userId: number, postIds: number[]): Promise<number[]> {
    if (postIds.length === 0) return [];
    const rows = await this.likeRepo.find({
      where: { user: { id: userId }, postId: In(postIds) },
    });
    return rows.map((r) => r.postId);
  }

  /** 管理端列表：全状态 + 关键字搜索 + 作者用户名 */
  async adminList(params: {
    page: number;
    limit: number;
    q?: string;
  }): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
    const qb = this.repo
      .createQueryBuilder('post')
      .leftJoinAndMapOne(
        'post.user',
        User,
        'author',
        'author.id = post.user_id',
      );
    if (params.q) {
      qb.andWhere('(post.title ILIKE :q OR post.content ILIKE :q)', {
        q: `%${params.q}%`,
      });
    }
    qb.orderBy('post.id', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map(({ user, ...rest }) => ({
        ...rest,
        authorUsername: user?.username ?? null,
      })),
      total,
    };
  }

  /** 管理端切换帖子可见性：published 展示 / hidden 下架 */
  async setStatus(id: number, status: 'published' | 'hidden') {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }
    post.status = status;
    await this.repo.save(post);
    return { success: true };
  }

  async remove(id: number, user?: { id: number; role?: string }) {
    const post = await this.repo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }
    // 仅作者本人或管理员可删除
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (!user || !post.user || post.user.id !== user.id)) {
      throw new ForbiddenException('无权删除此帖子');
    }
    // post_likes 外键无 ON DELETE CASCADE，必须先删点赞，否则删帖触发 23503
    // 使有赞帖子永远无法删除，后续的评论/收藏清理也执行不到
    await this.likeRepo.delete({ post: { id } });
    await this.repo.remove(post);
    // 清理帖子关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge('post', id);
    return { success: true };
  }

  /** 剥离 HTML/脚本标签，防止存储型 XSS */
  private stripHtml(raw: string): string {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<\/?(script|iframe|object|embed|form)[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
}
