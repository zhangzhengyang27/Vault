import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OperLog } from "../entities/oper-log.entity";

/** 操作日志：由 OperLogInterceptor 写入，管理端查询/清理 */
@Injectable()
export class OperLogService {
  private readonly logger = new Logger(OperLogService.name);

  constructor(
    @InjectRepository(OperLog)
    private readonly repo: Repository<OperLog>,
  ) {}

  async write(input: {
    userId: number | null;
    username: string;
    method: string;
    path: string;
    statusCode: number;
    ip?: string | null;
    userAgent?: string | null;
    durationMs: number;
    body?: unknown;
  }): Promise<void> {
    try {
      await this.repo.insert({
        userId: input.userId,
        username: input.username || "anonymous",
        method: input.method,
        path: input.path.slice(0, 300),
        statusCode: input.statusCode,
        ip: input.ip ?? null,
        userAgent: (input.userAgent ?? "").slice(0, 500) || null,
        durationMs: input.durationMs,
        body: this.redact(input.body),
      });
    } catch (e) {
      this.logger.warn(
        `操作日志写入失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 密码类字段脱敏 + 超长截断 */
  private redact(body: unknown): string | null {
    if (body === undefined || body === null) return null;
    let text: string;
    try {
      if (typeof body === "string") {
        text = body;
      } else {
        const clone = { ...(body as Record<string, unknown>) };
        for (const key of Object.keys(clone)) {
          if (/password|token|secret/i.test(key)) clone[key] = "***";
        }
        text = JSON.stringify(clone);
      }
    } catch {
      // 走到这里说明序列化失败（如循环引用），仅记录占位标记
      text = "[unserializable body]";
    }
    return text.length > 2000 ? text.slice(0, 2000) + "…(截断)" : text;
  }

  async list(params: {
    page: number;
    limit: number;
    username?: string;
  }): Promise<{ items: OperLog[]; total: number }> {
    const qb = this.repo.createQueryBuilder("log");
    if (params.username) {
      qb.andWhere("log.username ILIKE :username", {
        username: `%${params.username}%`,
      });
    }
    qb.orderBy("log.createdAt", "DESC")
      .skip((params.page - 1) * params.limit)
      .take(params.limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async detail(id: number): Promise<OperLog | null> {
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async clear(): Promise<void> {
    await this.repo.clear();
  }
}
