import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import { Post } from '../../entities/post.entity';
import { User } from '../../entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentLike } from '../../entities/comment-like.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { isPgErrorWithCode } from '../../common/pg-error';

/** 允许评论的目标类型（与实体表一一对应，防止任意字符串写入） */
const COMMENT_TARGETS = [
  'tool',
  'prompt',
  'article',
  'news',
  'repo',
  'resource',
  'mcp',
  'post',
] as const;

/** targetType → 对应实体名（用于校验目标存在性） */
const TARGET_ENTITIES: Record<string, string> = {
  tool: 'Tool',
  prompt: 'Prompt',
  article: 'Article',
  news: 'News',
  repo: 'Repo',
  resource: 'Resource',
  mcp: 'Mcp',
  post: 'Post',
};

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly repo: Repository<Comment>,
    @InjectRepository(CommentLike)
    private readonly likeRepo: Repository<CommentLike>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  /** 剥离 user 关联只透出 userId（供前端判断删除权限，不泄露 User 其余字段） */
  private stripUser(c: Comment) {
    return { ...c, userId: c.user?.id ?? null, user: undefined };
  }

  /**
   * 帖子评论列表（平铺，前端组树）。
   * latest：id 升序（时间正序）；hot：点赞降序（同级按时间正序），
   * 子回复渲染顺序由前端按 parentId 保持本数组的相对顺序。
   */
  findByPost(postId: number, sort: 'latest' | 'hot' = 'latest') {
    // 兼容两条写入路径：专用路径写 post_id 列，通用 createForTarget 只写
    // target_type/target_id 列（历史数据如此），OR 查询保证两边都能读到
    return this.repo
      .find({
        where: [{ postId }, { targetType: 'post', targetId: postId }],
        order: sort === 'hot' ? { likes: 'DESC', id: 'ASC' } : { id: 'ASC' },
        relations: { user: true },
      })
      .then((rows) => rows.map((c) => this.stripUser(c)));
  }

  /**
   * 校验一级回复的父评论：存在、同目标、本身是顶级评论（嵌套仅一级）。
   * 同目标判定需兼容存量数据：历史评论只写 target_type/target_id 列
   * （post_id 为 null），两条 OR 读取路径都能读到它们，回复校验必须一致。
   */
  private assertParentComment(
    parent: Comment | null,
    match: {
      postId: number | null;
      targetType: string;
      targetId: number | null;
    },
  ) {
    if (parent == null) {
      throw new NotFoundException('回复的评论不存在');
    }
    const sameTarget =
      (parent.postId !== null && parent.postId === match.postId) ||
      (parent.targetType === match.targetType &&
        parent.targetId === match.targetId);
    if (!sameTarget) {
      throw new BadRequestException('回复目标与父评论不一致');
    }
    if (parent.parentId !== null) {
      // 嵌套仅一级：回复「楼中楼的回复」统一挂到顶级评论
      throw new BadRequestException('仅支持对顶级评论回复');
    }
  }

  async create(
    postId: number,
    dto: CreateCommentDto,
    user?: { id: number; username: string },
  ) {
    // 与 createForTarget 对齐：校验目标存在且已发布，并维护 comments 冗余计数。
    // 此前不校验存在性（可对不存在的 postId 写孤儿评论）也不 +1，
    // 而删除路径统一 -1，导致 posts.comments 持续负漂移。
    const post = await this.dataSource.getRepository(Post).findOne({
      where: { id: postId, status: 'published' },
      relations: { user: true },
    });
    if (!post) {
      throw new NotFoundException(`帖子不存在或未发布: #${postId}`);
    }
    // 回复：校验父评论并归位到顶级（仅一级嵌套）
    let parent: Comment | null = null;
    if (dto.parentId) {
      // 带 user 关系：回复通知需要父评论作者
      parent = await this.repo.findOne({
        where: { id: dto.parentId },
        relations: { user: true },
      });
      this.assertParentComment(parent, {
        postId,
        targetType: 'post',
        targetId: postId,
      });
    }
    const saved = await this.repo.save(
      this.repo.create({
        postId,
        targetType: 'post',
        targetId: postId,
        parentId: parent?.id ?? null,
        content: this.stripHtml(dto.content),
        // 登录用户一律以账号用户名署名，忽略客户端传入的 authorName（防冒名）
        authorName: user?.username ?? '匿名',
        // TypeORM 只凭 id 即可建立关联，无需加载完整 User 实体
        user: user ? { id: user.id } : null,
      }),
    );
    await this.shiftPostComments(postId, 1);
    if (user) {
      if (parent) {
        // 回复通知父评论作者：匿名回复、自己回复自己不通知
        if (parent.user && parent.user.id !== user.id) {
          await this.notifications.createForUser(parent.user.id, {
            type: 'comment',
            title: `${user.username} 回复了你的评论`,
            content: saved.content.slice(0, 100),
            targetType: 'post',
            targetId: postId,
          });
        }
      } else if (post.user && post.user.id !== user.id) {
        // 顶级评论通知帖子作者：匿名评论、自己评论自己不通知
        await this.notifications.createForUser(post.user.id, {
          type: 'comment',
          title: `${user.username} 评论了你的帖子「${post.title}」`,
          content: saved.content.slice(0, 100),
          targetType: 'post',
          targetId: postId,
        });
      }
    }
    return saved;
  }

  /** 通用评论：工具 / 提示词 / 文章 / 资讯 / 开源 / 资源 / MCP / 帖子 */
  findByTarget(targetType: string, targetId: number) {
    return this.repo
      .find({
        where: { targetType, targetId },
        order: { id: 'ASC' },
        relations: { user: true },
      })
      .then((rows) => rows.map((c) => this.stripUser(c)));
  }

  private async assertTargetExists(targetType: string, targetId: number) {
    if (!(COMMENT_TARGETS as readonly string[]).includes(targetType)) {
      throw new BadRequestException(`不支持的评论目标类型: ${targetType}`);
    }
    const entityName = TARGET_ENTITIES[targetType];
    // 全部目标实体都有 status 列：只允许对已发布内容评论，
    // 否则评论接口会成为未发布内容的存在性 oracle 且可抢评待审内容
    const target = await this.dataSource
      .getRepository(entityName)
      .findOne({ where: { id: targetId, status: 'published' } });
    if (!target) {
      throw new NotFoundException(
        `评论目标不存在或未发布: ${targetType} #${targetId}`,
      );
    }
  }

  /** 帖子评论数冗余列维护（列表展示用，读取时避免聚合查询；负数用于删父评论连子回复的场景） */
  private async shiftPostComments(postId: number, delta: number) {
    await this.dataSource
      .getRepository(Post)
      .increment({ id: postId }, 'comments', delta);
  }

  async createForTarget(
    targetType: string,
    targetId: number,
    dto: CreateCommentDto,
    user?: { id: number; username: string },
  ) {
    await this.assertTargetExists(targetType, targetId);
    // 回复：校验父评论并归位到顶级（仅一级嵌套）
    let parent: Comment | null = null;
    if (dto.parentId) {
      // 带 user 关系：回复通知需要父评论作者
      parent = await this.repo.findOne({
        where: { id: dto.parentId },
        relations: { user: true },
      });
      this.assertParentComment(parent, {
        postId: targetType === 'post' ? targetId : null,
        targetType,
        targetId,
      });
    }
    const saved = await this.repo.save(
      this.repo.create({
        // 帖子评论同时回填 post_id 列，与专用写入路径保持一致，
        // 避免 findByPost / findByTarget 两条读取路径出现数据盲区
        postId: targetType === 'post' ? targetId : null,
        targetType,
        targetId,
        parentId: parent?.id ?? null,
        content: this.stripHtml(dto.content),
        // 登录用户一律以账号用户名署名，忽略客户端传入的 authorName（防冒名）
        authorName: user?.username ?? '匿名',
        rating: dto.rating ?? null,
        // TypeORM 只凭 id 即可建立关联，无需加载完整 User 实体
        user: user ? { id: user.id } : null,
      }),
    );
    if (targetType === 'post') {
      await this.shiftPostComments(targetId, 1);
      if (user) {
        if (parent) {
          // 回复通知父评论作者（仅 post 评论有跳转上下文）
          if (parent.user && parent.user.id !== user.id) {
            await this.notifications.createForUser(parent.user.id, {
              type: 'comment',
              title: `${user.username} 回复了你的评论`,
              content: saved.content.slice(0, 100),
              targetType: 'post',
              targetId,
            });
          }
        } else {
          // 顶级评论通知帖子作者（通用入口写帖子评论同样触发）
          const post = await this.postRepo.findOne({
            where: { id: targetId },
            relations: { user: true },
          });
          if (post && post.user && post.user.id !== user.id) {
            await this.notifications.createForUser(post.user.id, {
              type: 'comment',
              title: `${user.username} 评论了你的帖子「${post.title}」`,
              content: saved.content.slice(0, 100),
              targetType: 'post',
              targetId,
            });
          }
        }
      }
    }
    return saved;
  }

  /** 评论点赞/取消赞（幂等切换），点赞时通知评论作者 */
  async toggleLike(commentId: number, user: { id: number; username: string }) {
    const comment = await this.repo.findOne({
      where: { id: commentId },
      relations: { user: true },
    });
    if (!comment) throw new NotFoundException('评论不存在');

    const existing = await this.likeRepo.findOne({
      where: { comment: { id: commentId }, user: { id: user.id } },
    });
    if (existing) {
      // 条件删除并按 affected 行数回减，防止并发 unlike 双减计数漂移
      const del = await this.likeRepo.delete({
        comment: { id: commentId },
        user: { id: user.id },
      });
      if ((del.affected ?? 0) > 0) {
        await this.repo.decrement({ id: commentId }, 'likes', 1);
        return { liked: false, likes: Math.max(0, comment.likes - 1) };
      }
      return { liked: false, likes: comment.likes };
    }
    try {
      await this.likeRepo.save(
        this.likeRepo.create({
          comment: { id: commentId },
          user: { id: user.id },
        }),
      );
    } catch (err) {
      // 并发双击：唯一约束命中说明对方请求已插入且已 increment，
      // 直接返回避免重复 +1 造成计数永久漂移
      if (!isPgErrorWithCode(err, '23505')) throw err;
      return { liked: true, likes: comment.likes + 1 };
    }
    await this.repo.increment({ id: commentId }, 'likes', 1);
    // 点赞通知评论作者：匿名评论、自己赞自己不通知；仅 post 评论有跳转上下文
    if (
      comment.targetType === 'post' &&
      comment.user &&
      comment.user.id !== user.id
    ) {
      await this.notifications.createForUser(comment.user.id, {
        type: 'like',
        title: `${user.username} 赞了你的评论`,
        content: comment.content.slice(0, 100),
        targetType: 'post',
        targetId: comment.targetId ?? undefined,
      });
    }
    return { liked: true, likes: comment.likes + 1 };
  }

  /** 查询用户对一批评论的点赞状态（前端列表渲染用；IN 查询避免全量拉取） */
  async likedCommentIds(
    userId: number,
    commentIds: number[],
  ): Promise<number[]> {
    if (commentIds.length === 0) return [];
    const rows = await this.likeRepo.find({
      where: { user: { id: userId }, commentId: In(commentIds) },
    });
    return rows.map((r) => r.commentId);
  }

  /** 管理端列表：全量评论 + 帖子评论联出标题 */
  async adminList(params: {
    page: number;
    limit: number;
    q?: string;
    targetType?: string;
  }): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
    const qb = this.repo
      .createQueryBuilder('comment')
      .leftJoinAndMapOne(
        'comment.user',
        User,
        'author',
        'author.id = comment.user_id',
      );
    if (params.q) {
      qb.andWhere('comment.content ILIKE :q', { q: `%${params.q}%` });
    }
    if (params.targetType && params.targetType !== 'all') {
      qb.andWhere('comment.targetType = :targetType', {
        targetType: params.targetType,
      });
    }
    qb.orderBy('comment.id', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);
    const [items, total] = await qb.getManyAndCount();

    // 帖子评论批量联出标题（其余目标类型只展示目标 id）
    const postIds = [
      ...new Set(
        items
          .filter((c) => c.targetType === 'post' && c.targetId != null)
          .map((c) => c.targetId as number),
      ),
    ];
    const titleMap = new Map<number, string>();
    if (postIds.length) {
      const posts = await this.postRepo.find({
        where: postIds.map((id) => ({ id })),
      });
      posts.forEach((p) => titleMap.set(p.id, p.title));
    }
    return {
      items: items.map(({ user, ...rest }) => ({
        ...rest,
        authorUsername: user?.username ?? null,
        postTitle:
          rest.targetType === 'post' && rest.targetId != null
            ? (titleMap.get(rest.targetId) ?? null)
            : null,
      })),
      total,
    };
  }

  async remove(id: number, user?: { id: number; role?: string }) {
    const comment = await this.repo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }
    // 仅作者本人或管理员可删除
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (!user || !comment.user || comment.user.id !== user.id)) {
      throw new ForbiddenException('无权删除此评论');
    }
    // 统计子回复、删除、修正计数放进同一事务：
    // 避免统计与删除之间新回复写入导致少减计数（DB CASCADE 删父连子）
    const commentId = comment.id;
    await this.dataSource.transaction(async (em) => {
      const childCount = comment.parentId
        ? 0
        : await em.count(Comment, { where: { parentId: commentId } });
      await em.remove(comment);
      if (comment.targetType === 'post' && comment.targetId != null) {
        // 删父评论连子回复，帖子评论数按 1+子回复数 递减，否则计数负漂移复发
        await em.decrement(
          Post,
          { id: comment.targetId },
          'comments',
          1 + childCount,
        );
      }
    });
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
