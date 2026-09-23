import { Injectable, NotFoundException } from '@nestjs/common';
import { escapeLike, LIKE_ESCAPE_SQL } from '../../common/like.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Repo } from '../../entities/repo.entity';
import { CreateRepoDto } from './dto/create-repo.dto';
import { ContentCleanupService } from '../../common/content-cleanup.service';

export interface RepoQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
}

@Injectable()
export class ReposService {
  constructor(
    @InjectRepository(Repo)
    private readonly repo: Repository<Repo>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: RepoQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('repo');

    // 公开列表只展示已发布内容（pending/rejected 为采集审核队列内部状态）
    qb.andWhere('repo.status = :status', { status: 'published' });
    // 只收真正的仓库条目：stars 为空的多是误入的采集杂项（2026-09-14 清理过一批
    // 混进 repos 表的博客文章），公开列表对「无热度数据」的条目没有展示价值
    qb.andWhere('repo.stars IS NOT NULL');

    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('repo.name ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          }).orWhere('repo.description ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          });
        }),
      );
    }

    switch (query.sort) {
      case 'stars':
        qb.orderBy('repo.stars', 'DESC');
        break;
      case 'newest':
        qb.orderBy('repo.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('repo.id', 'ASC');
    }

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(slug: string) {
    const entity = await this.repo.findOne({
      where: { slug, status: 'published' },
    });
    if (!entity) throw new NotFoundException('开源项目不存在或未发布');
    return entity;
  }

  async create(dto: CreateRepoDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(slug: string, dto: Partial<CreateRepoDto>) {
    const repo = await this.repo.findOne({ where: { slug } });
    if (!repo) throw new NotFoundException(`开源项目 ${slug} 不存在`);
    Object.assign(repo, dto);
    return this.repo.save(repo);
  }

  async remove(slug: string) {
    const repo = await this.repo.findOne({ where: { slug } });
    if (!repo) throw new NotFoundException(`开源项目 ${slug} 不存在`);
    const saved = await this.repo.remove(repo);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge('repo', repo.id);
    return saved;
  }
}
