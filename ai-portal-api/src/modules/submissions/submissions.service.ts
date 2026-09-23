import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Submission } from '../../entities/submission.entity';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { News } from '../../entities/news.entity';
import { Mcp } from '../../entities/mcp.entity';
import { Notification } from '../../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly repo: Repository<Submission>,
    @InjectRepository(Tool)
    private readonly toolRepo: Repository<Tool>,
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
    @InjectRepository(Mcp)
    private readonly mcpRepo: Repository<Mcp>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /* ------------------------- 用户侧 ------------------------- */

  create(userId: number, dto: CreateSubmissionDto) {
    return this.repo.save(
      this.repo.create({
        userId,
        type: dto.type,
        title: this.stripHtml(dto.title),
        description: dto.description
          ? this.stripHtml(dto.description)
          : undefined,
        content: dto.content ? this.stripHtml(dto.content) : undefined,
        url: dto.url,
        contact: dto.contact ?? '',
        status: 'pending',
      }),
    );
  }

  async findMy(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { id: 'DESC' },
    });
  }

  async findOneForUser(userId: number, id: number) {
    const sub = await this.repo.findOne({ where: { id, userId } });
    if (!sub) throw new NotFoundException('投稿不存在');
    return sub;
  }

  /* ------------------------- 管理侧 ------------------------- */

  async findAll(status?: string) {
    return this.repo.find({
      where: status ? { status } : {},
      order: { id: 'DESC' },
      take: 100,
    });
  }

  async approve(id: number, adminId: number) {
    // 事务 + 行锁：防止双击/双管理员并发双审（重复发布内容），并保证
    // 「发布内容 + 投稿状态 + 结果通知」三者原子，任何一步失败整体回滚
    const { sub, slug } = await this.repo.manager.transaction(async (em) => {
      // user 关联是 eager + nullable：findOne 会生成 LEFT JOIN，
      // 而 Postgres 禁止 FOR UPDATE 作用于外连接的可空侧，必须用
      // 无 join 的 QueryBuilder 只锁 submission 行本身
      const locked = await em
        .getRepository(Submission)
        .createQueryBuilder('s')
        .where('s.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!locked) throw new NotFoundException('投稿不存在');
      if (locked.status !== 'pending') {
        throw new BadRequestException('该投稿已处理，不能重复审核');
      }

      const slug = this.makeSlug(locked.title);
      let contentId: number;

      switch (locked.type) {
        case 'tool':
          contentId = (
            await em.save(
              em.create(Tool, {
                slug,
                name: locked.title,
                description: locked.description ?? '',
                content: locked.content ?? '',
                tags: [],
                status: 'published',
                phase: 'submission',
              }),
            )
          ).id;
          break;
        case 'prompt':
          contentId = (
            await em.save(
              em.create(Prompt, {
                slug,
                title: locked.title,
                description: locked.description ?? '',
                content: locked.content ?? '',
                source: 'submission',
                status: 'published',
                phase: 'submission',
              }),
            )
          ).id;
          break;
        case 'news':
          contentId = (
            await em.save(
              em.create(News, {
                slug,
                title: locked.title,
                summary: locked.description ?? '',
                content: locked.content ?? undefined,
                time: new Date().toISOString().slice(0, 10),
                status: 'published',
                phase: 'submission',
              }),
            )
          ).id;
          break;
        case 'mcp':
          contentId = (
            await em.save(
              em.create(Mcp, {
                slug,
                name: locked.title,
                description: locked.description ?? '',
                endpoint: locked.url ?? '',
                type: 'mcp',
                phase: 'submission',
              }),
            )
          ).id;
          break;
        default:
          throw new BadRequestException('不支持的投稿类型');
      }

      locked.status = 'approved';
      locked.reviewedBy = adminId;
      locked.reviewedAt = new Date();
      locked.contentId = contentId;
      await em.save(locked);

      // 投稿结果通知与审核同事务落库（订阅推送为扇出操作，事务外尽力而为）
      await em.save(
        em.create(Notification, {
          userId: locked.userId,
          type: 'submission',
          title: `你的投稿《${locked.title}》已审核通过`,
          content: '内容已正式发布，感谢你的贡献',
          targetType: locked.type,
          targetId: contentId,
          targetSlug: slug,
          read: false,
        }),
      );

      return { sub: locked, slug };
    });

    // 订阅匹配推送：失败仅记录日志，不影响审核结果（可重试）
    try {
      await this.notificationsService.notifyContentPublished(
        {
          type: sub.type,
          id: sub.contentId!,
          title: sub.title,
          slug,
          description: sub.description,
          tags: [],
          categoryName: null,
        },
        { excludeUserIds: [sub.userId] }, // 投稿人自己已收到结果通知，不再重复推送
      );
    } catch (err) {
      this.logger.error(
        `投稿 ${sub.id} 发布后的订阅推送失败: ${(err as Error).message}`,
      );
    }

    return sub;
  }

  async reject(id: number, adminId: number, reason?: string) {
    // 行锁 + 事务：同样防止并发双审
    const sub = await this.repo.manager.transaction(async (em) => {
      // user 关联是 eager + nullable：findOne 会生成 LEFT JOIN，
      // 而 Postgres 禁止 FOR UPDATE 作用于外连接的可空侧，必须用
      // 无 join 的 QueryBuilder 只锁 submission 行本身
      const locked = await em
        .getRepository(Submission)
        .createQueryBuilder('s')
        .where('s.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!locked) throw new NotFoundException('投稿不存在');
      if (locked.status !== 'pending') {
        throw new BadRequestException('该投稿已处理，不能重复审核');
      }

      locked.status = 'rejected';
      locked.rejectReason = reason ?? '';
      locked.reviewedBy = adminId;
      locked.reviewedAt = new Date();
      await em.save(locked);

      await em.save(
        em.create(Notification, {
          userId: locked.userId,
          type: 'submission',
          title: `你的投稿《${locked.title}》未通过审核`,
          content: reason || '内容不符合收录标准，请修改后重新提交',
          targetType: locked.type,
          targetId: null,
          read: false,
        }),
      );

      return locked;
    });
    return sub;
  }

  private makeSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    // 随机后缀避免相同标题冲突（比确定性 hash 更安全）
    const suffix = crypto.randomBytes(4).toString('hex');
    return `${base || 'item'}-${suffix}`;
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
