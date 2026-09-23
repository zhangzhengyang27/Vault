import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Response } from 'express';
import { OperLogService } from './oper-log.service';

/**
 * 操作日志拦截器：记录管理端的变更类请求（POST/PATCH/PUT/DELETE），
 * 成功与失败（4xx/5xx）都落库。GET 请求不记录。
 * 挂载方式：在需要的控制器类上加 @UseInterceptors(OperLogInterceptor)
 */
@Injectable()
export class OperLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperLogInterceptor.name);

  constructor(private readonly operLogs: OperLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<{
      method: string;
      path?: string;
      route?: { path?: string };
      baseUrl?: string;
      originalUrl?: string;
      body?: unknown;
      user?: { id: number; username: string } | null;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return next.handle();
    }

    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () =>
          void this.write(req, http.getResponse<Response>().statusCode, start),
        error: (err: {
          status?: number;
          statusCode?: number;
          message?: string;
        }) =>
          void this.write(
            req,
            err?.status ?? err?.statusCode ?? 500,
            start,
            err?.message,
          ),
      }),
    );
  }

  private async write(
    req: {
      user?: { id: number; username: string } | null;
      method: string;
      originalUrl?: string;
      path?: string;
      body?: unknown;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    },
    statusCode: number,
    start: number,
    error?: string,
  ): Promise<void> {
    const path = (req.originalUrl ?? req.path ?? '').split('?')[0];
    try {
      await this.operLogs.write({
        userId: req.user?.id ?? null,
        username: req.user?.username ?? 'anonymous',
        method: req.method,
        path,
        statusCode,
        ip: req.ip,
        userAgent: req.headers?.['user-agent'] as string,
        durationMs: Date.now() - start,
        body: error !== undefined ? { error } : req.body,
      });
    } catch (e) {
      this.logger.warn(
        `操作日志拦截器写入失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
