import { NotFoundException, Injectable } from '@nestjs/common';
import { escapeLike, LIKE_ESCAPE_SQL } from '../../common/like.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Mcp } from '../../entities/mcp.entity';
import { CreateMcpDto } from './dto/create-mcp.dto';
import { ContentCleanupService } from '../../common/content-cleanup.service';

export interface McpQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  type?: string;
}

@Injectable()
export class McpsService {
  constructor(
    @InjectRepository(Mcp)
    private readonly repo: Repository<Mcp>,
    private readonly cleanup: ContentCleanupService,
  ) {}

  async findAll(query: McpQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('mcp');

    // 公开接口只返回已发布内容（与全站状态机一致）
    qb.andWhere('mcp.status = :status', { status: 'published' });

    if (query.type) {
      qb.andWhere('mcp.type = :type', { type: query.type });
    }

    if (query.q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('mcp.name ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          }).orWhere('mcp.description ILIKE :q' + LIKE_ESCAPE_SQL, {
            q: `%${escapeLike(query.q)}%`,
          });
        }),
      );
    }

    switch (query.sort) {
      case 'newest':
        qb.orderBy('mcp.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('mcp.id', 'ASC');
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

  async findOne(slug: string, type?: string) {
    const entity = await this.repo.findOne({
      where: { slug, status: 'published', ...(type ? { type } : {}) },
    });
    if (!entity) throw new NotFoundException('MCP不存在');
    return entity;
  }

  async create(dto: CreateMcpDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(slug: string, dto: Partial<CreateMcpDto>) {
    const mcp = await this.repo.findOne({ where: { slug } });
    if (!mcp) return null;
    Object.assign(mcp, dto);
    return this.repo.save(mcp);
  }

  async remove(slug: string) {
    const mcp = await this.repo.findOne({ where: { slug } });
    if (!mcp) return null;
    const saved = await this.repo.remove(mcp);
    // 清理该内容关联的评论/收藏/通知（多态关联无外键）
    await this.cleanup.purge('mcp', mcp.id);
    return saved;
  }
}
