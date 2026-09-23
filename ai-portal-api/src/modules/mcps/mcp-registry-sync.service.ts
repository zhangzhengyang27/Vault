import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mcp } from '../../entities/mcp.entity';

/**
 * MCP 官方 Registry 同步服务。
 *
 * 对接 modelcontextprotocol.io 官方 Registry REST API，
 * 定时拉取全量公开 MCP 服务器元数据，自动去重入库。
 *
 * API 文档：https://registry.modelcontextprotocol.io/docs
 * 端点：GET /v0.1/servers
 */
@Injectable()
export class McpRegistrySyncService {
  private readonly logger = new Logger(McpRegistrySyncService.name);
  private readonly REGISTRY_URL =
    'https://registry.modelcontextprotocol.io/v0.1/servers';
  private readonly TIMEOUT_MS = 30000;

  constructor(
    @InjectRepository(Mcp)
    private readonly mcpRepo: Repository<Mcp>,
  ) {}

  /**
   * 从官方 Registry 拉取全量服务器列表并同步入库。
   * 返回同步统计：新增、跳过、失败数量。
   */
  async syncFromRegistry(): Promise<{
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    this.logger.log('开始从官方 MCP Registry 同步服务器列表...');

    let servers: RegistryServer[] = [];
    try {
      servers = await this.fetchRegistryServers();
    } catch (err) {
      this.logger.error(`从 Registry 拉取失败: ${(err as Error).message}`);
      return { fetched: 0, created: 0, updated: 0, skipped: 0, failed: 1 };
    }

    this.logger.log(`从 Registry 获取到 ${servers.length} 个服务器`);

    // 预取已有 slug 与来源（endpoint），避免逐条查库
    const existing = await this.mcpRepo.find({
      select: { slug: true, endpoint: true },
    });
    const existingSlugs = new Set(existing.map((m) => m.slug));
    const endpointBySlug = new Map(
      existing.map((m) => [m.slug, m.endpoint ?? '']),
    );
    let updated = 0;

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const server of servers) {
      try {
        let slug = this.makeSlug(server);
        if (existingSlugs.has(slug)) {
          // 同名条目分两种情况：
          // 1) 同源（registry 仓库 URL 与库内 endpoint 一致）→ 刷新可能过期的元数据；
          // 2) 异源 → 追加仓库哈希区分，避免不同服务器被静默跳过、永远进不了目录
          const sameSource =
            server.repository && endpointBySlug.get(slug) === server.repository;
          if (sameSource) {
            const row = await this.mcpRepo.findOne({ where: { slug } });
            if (row) {
              row.description =
                server.description?.slice(0, 1000) || row.description;
              row.endpoint = this.inferEndpoint(server);
              row.tags = this.extractTags(server);
              await this.mcpRepo.save(row);
              updated++;
            } else {
              skipped++;
            }
            continue;
          }
          if (server.repository) {
            const alt = `${slug}-${crypto.createHash('sha1').update(server.repository).digest('hex').slice(0, 8)}`;
            if (existingSlugs.has(alt)) {
              skipped++;
              continue;
            }
            slug = alt;
          } else {
            skipped++;
            continue;
          }
        }

        const mcp = this.mcpRepo.create({
          slug,
          name: server.name || slug,
          description:
            server.description?.slice(0, 1000) || `MCP 服务器：${server.name}`,
          endpoint: this.inferEndpoint(server),
          type: 'mcp',
          tags: this.extractTags(server),
          phase: 'registry',
          // 第三方内容默认待审：需人工审核通过后才对公众可见。
          // 已入库并通过审核的存量条目不受影响（上方 sameSource 分支不改 status）。
          status: 'pending',
        });

        await this.mcpRepo.save(mcp);
        existingSlugs.add(slug);
        created++;
      } catch (err) {
        failed++;
        this.logger.warn(
          `同步服务器 ${server.name} 失败: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Registry 同步完成：获取 ${servers.length}, 新增 ${created}, 更新 ${updated}, 跳过 ${skipped}, 失败 ${failed}`,
    );
    return { fetched: servers.length, created, updated, skipped, failed };
  }

  /** 每天凌晨 4 点自动同步 */
  @Cron('0 0 4 * * *')
  async dailySync() {
    try {
      await this.syncFromRegistry();
    } catch (err) {
      this.logger.error(`每日 Registry 同步失败: ${(err as Error).message}`);
    }
  }

  /* ------------------------- 内部工具 ------------------------- */

  private async fetchRegistryServers(): Promise<RegistryServer[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const res = await fetch(this.REGISTRY_URL, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Registry API 返回 ${res.status}`);
      }

      // Registry v0.1 返回 { servers: [...] } 或直接数组
      const data = (await res.json()) as
        | RegistryServer[]
        | { servers?: RegistryServer[]; data?: RegistryServer[] };
      const list = Array.isArray(data)
        ? data
        : (data.servers ?? data.data ?? []);
      return list;
    } finally {
      clearTimeout(timer);
    }
  }

  private makeSlug(server: RegistryServer): string {
    const raw =
      server.name ||
      server.repository
        ?.split('/')
        .pop()
        ?.replace(/\.git$/, '') ||
      'mcp-server';
    const base = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    return base || 'mcp-server';
  }

  private inferEndpoint(server: RegistryServer): string {
    // 优先用 repository URL（GitHub 仓库），其次是 homepage
    return (
      server.repository || server.url || server.homepage || server.name || ''
    );
  }

  private extractTags(server: RegistryServer): string[] {
    const tags: string[] = [];
    if (server.tags?.length) {
      tags.push(...server.tags.slice(0, 3));
    }
    if (server.repository?.includes('github.com')) {
      tags.push('GitHub');
    }
    return tags.slice(0, 5);
  }
}

/** 官方 Registry 返回的服务器元数据结构（v0.1） */
interface RegistryServer {
  name?: string;
  description?: string;
  url?: string;
  repository?: string;
  homepage?: string;
  tags?: string[];
  version?: string;
  author?: string;
  [key: string]: any;
}
