import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { clampInt } from '../posts/posts.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly repo: Repository<Report>,
  ) {}

  /** 登录用户提交举报（同人对同一目标的多条未处理举报去重，避免刷屏） */
  async create(dto: CreateReportDto, user?: { username: string }) {
    const existing = await this.repo.findOne({
      where: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        status: 'open',
      },
    });
    if (existing) {
      return existing;
    }
    return this.repo.save(
      this.repo.create({
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetTitle: dto.targetTitle ?? null,
        reason: dto.reason,
        reporter: user?.username ?? null,
        status: 'open',
      }),
    );
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const safePage = clampInt(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clampInt(limit, 20, 100);
    const [items, total] = await this.repo.findAndCount({
      where: status && status !== 'all' ? { status } : {},
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      items,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /** 管理员标记处理结果 */
  async resolve(id: number, status: 'open' | 'resolved') {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('举报不存在');
    report.status = status;
    return this.repo.save(report);
  }
}
