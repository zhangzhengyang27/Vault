import { NotFoundException, Injectable } from '@nestjs/common';
import { escapeLike, LIKE_ESCAPE_SQL } from '../../common/like.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Resource } from '../../entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ContentCleanupService } from '../../common/content-cleanup.service';

export interface ResourceQuery {
  page?: number;
  limit?: number;
  type?: string;
  q?: string;
  sort?: string;
}

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly repo: Repository<Resource>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: ResourceQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('resource');

    // 公开接口只返回已发布内容（与全站状态机一致）
    qb.andWhere('resource.status = :status', { status: 'published' });

    if (query.type) {
      qb.andWhere('resource.type = :type', { type: query.type });
    }
    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('resource.title ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          }).orWhere('resource.description ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          });
        }),
      );
    }

    switch (query.sort) {
      case 'newest':
        qb.orderBy('resource.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('resource.id', 'ASC');
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
    if (!entity) throw new NotFoundException('资源不存在');
    return entity;
  }

  async create(dto: CreateResourceDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(slug: string, dto: Partial<CreateResourceDto>) {
    const resource = await this.repo.findOne({ where: { slug } });
    if (!resource) return null;
    Object.assign(resource, dto);
    return this.repo.save(resource);
  }

  async remove(slug: string) {
    const resource = await this.repo.findOne({ where: { slug } });
    if (!resource) return null;
    const saved = await this.repo.remove(resource);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge('resource', resource.id);
    return saved;
  }
}
