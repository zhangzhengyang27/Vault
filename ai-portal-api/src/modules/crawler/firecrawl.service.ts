import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Firecrawl 单页抓取结果中的 metadata 字段。
 * 官方文档未保证字段齐全，故全部可选，并保留索引签名以透传未知字段。
 */
interface FirecrawlMetadata {
  sourceURL?: string;
  url?: string;
  title?: string;
  description?: string;
  language?: string;
  keywords?: string[];
  robots?: string;
  ogImage?: string;
  [key: string]: unknown;
}

/** Firecrawl /v1/scrape 响应，以及 /v1/crawl 返回的单条记录 */
interface FirecrawlScrapeResponse {
  success?: boolean;
  error?: string;
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: FirecrawlMetadata;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    metadata?: FirecrawlMetadata;
  };
}

/** Firecrawl /v1/crawl 启动响应 */
interface FirecrawlCrawlStartResponse {
  id?: string;
}

/** Firecrawl /v1/crawl/{jobId} 状态响应 */
interface FirecrawlCrawlStatusResponse {
  status: 'scraping' | 'completed' | 'failed' | 'cancelled';
  total?: number;
  completed?: number;
  creditsUsed?: number;
  data?: FirecrawlScrapeResponse[];
}

/**
 * Firecrawl 网页抓取服务。
 *
 * 将任意 URL 转换为干净的 Markdown / HTML / 结构化文本，
 * 替代自研 Playwright 采集器，规避反爬、JS 渲染、内容清洗等技术债务。
 *
 * 支持两种部署模式：
 * 1. 托管 API（https://api.firecrawl.dev）— 需要 FIRECRAWL_API_KEY
 * 2. 自托管开源版 — 设置 FIRECRAWL_BASE_URL 指向自部署实例
 *
 * 未配置时优雅降级，isAvailable() 返回 false，调用方应回退到 RSS 或提示手动配置。
 */
@Injectable()
export class FirecrawlService {
  private readonly logger = new Logger(FirecrawlService.name);

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FIRECRAWL_API_KEY', '');
    this.baseUrl =
      this.configService.get<string>('FIRECRAWL_BASE_URL', '') ||
      'https://api.firecrawl.dev';
    this.timeoutMs = Number(
      this.configService.get<string>('FIRECRAWL_TIMEOUT', '30000'),
    );
  }

  /** Firecrawl 是否可用（配置了 API Key 或自托管地址） */
  isAvailable(): boolean {
    return Boolean(this.apiKey) || this.baseUrl !== 'https://api.firecrawl.dev';
  }

  /** 返回配置模式：hosted（托管API）/ self-hosted（自托管）/ unconfigured */
  getMode(): 'hosted' | 'self-hosted' | 'unconfigured' {
    if (!this.isAvailable()) return 'unconfigured';
    return this.apiKey ? 'hosted' : 'self-hosted';
  }

  /**
   * 单页抓取：将 URL 转换为 Markdown。
   * 返回 { markdown, html, title, description, metadata }
   */
  async scrapeUrl(
    url: string,
    options: {
      formats?: (
        'markdown' | 'html' | 'rawHtml' | 'content' | 'links' | 'screenshot'
      )[];
      onlyMainContent?: boolean;
      waitFor?: number;
    } = {},
  ): Promise<FirecrawlScrapeResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Firecrawl 未配置：请设置 FIRECRAWL_API_KEY 或 FIRECRAWL_BASE_URL',
      );
    }

    const body = {
      url,
      formats: options.formats ?? ['markdown'],
      onlyMainContent: options.onlyMainContent ?? true,
      ...(options.waitFor ? { waitFor: options.waitFor } : {}),
    };

    const res = await this.fetchWithTimeout(`${this.baseUrl}/v1/scrape`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Firecrawl 抓取失败 (${res.status}): ${text.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as FirecrawlScrapeResponse;
    if (data.success === false) {
      throw new Error(`Firecrawl 返回错误: ${data.error ?? '未知错误'}`);
    }

    return this.normalizeScrapeResult(data, url);
  }

  /**
   * 批量爬取：从一个入口 URL 出发，爬取整个站点的子页面。
   * 返回 jobId，用 getCrawlStatus 查询进度。
   */
  async startCrawl(
    url: string,
    options: {
      limit?: number;
      maxDepth?: number;
      includes?: string[];
      excludes?: string[];
      scrapeOptions?: Record<string, unknown>;
    } = {},
  ): Promise<{ jobId: string }> {
    if (!this.isAvailable()) {
      throw new Error('Firecrawl 未配置');
    }

    const body = {
      url,
      limit: options.limit ?? 100,
      maxDepth: options.maxDepth ?? 2,
      ...(options.includes?.length ? { includes: options.includes } : {}),
      ...(options.excludes?.length ? { excludes: options.excludes } : {}),
      scrapeOptions: options.scrapeOptions ?? { formats: ['markdown'] },
    };

    const res = await this.fetchWithTimeout(`${this.baseUrl}/v1/crawl`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Firecrawl 启动爬取失败 (${res.status}): ${text.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as FirecrawlCrawlStartResponse;
    if (!data.id) {
      throw new Error('Firecrawl 未返回 jobId');
    }
    return { jobId: data.id };
  }

  /** 查询批量爬取进度 */
  async getCrawlStatus(jobId: string): Promise<{
    status: 'scraping' | 'completed' | 'failed' | 'cancelled';
    total: number;
    completed: number;
    creditsUsed: number;
    data: FirecrawlScrapeResult[];
  }> {
    if (!this.isAvailable()) {
      throw new Error('Firecrawl 未配置');
    }

    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/v1/crawl/${jobId}`,
      { headers: this.authHeaders() },
    );

    if (!res.ok) {
      throw new Error(`Firecrawl 查询状态失败 (${res.status})`);
    }

    const data = (await res.json()) as FirecrawlCrawlStatusResponse;
    return {
      status: data.status,
      total: data.total ?? 0,
      completed: data.completed ?? 0,
      creditsUsed: data.creditsUsed ?? 0,
      data: (data.data ?? []).map((d: FirecrawlScrapeResponse) =>
        this.normalizeScrapeResult(d, d.metadata?.sourceURL ?? ''),
      ),
    };
  }

  /**
   * 批量爬取并等待完成（简化版，轮询直到完成或超时）。
   * 适用于小规模站点，避免前端需要管理 jobId。
   */
  async crawlAndWait(
    url: string,
    options: {
      limit?: number;
      maxDepth?: number;
      pollIntervalMs?: number;
      timeoutMs?: number;
    } = {},
  ): Promise<FirecrawlScrapeResult[]> {
    const { jobId } = await this.startCrawl(url, {
      limit: options.limit ?? 50,
      maxDepth: options.maxDepth ?? 2,
    });

    const pollInterval = options.pollIntervalMs ?? 3000;
    const timeout = options.timeoutMs ?? 120000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const status = await this.getCrawlStatus(jobId);
      if (status.status === 'completed') {
        return status.data;
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(`Firecrawl 爬取 ${status.status}: ${jobId}`);
      }
      await this.sleep(pollInterval);
    }

    throw new Error(`Firecrawl 爬取超时 (${timeout}ms): ${jobId}`);
  }

  /** 提取页面中的所有链接（用于发现子页面） */
  async extractLinks(url: string): Promise<string[]> {
    const result = await this.scrapeUrl(url, { formats: ['links'] });
    return result.links ?? [];
  }

  /* ------------------------- 内部工具 ------------------------- */

  /** 带超时的 fetch 封装，统一 AbortController 处理 */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs?: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs ?? this.timeoutMs,
    );
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          `Firecrawl 请求超时 (${timeoutMs ?? this.timeoutMs}ms): ${url}`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 统一认证头 */
  private authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  private normalizeScrapeResult(
    data: FirecrawlScrapeResponse,
    sourceUrl: string,
  ): FirecrawlScrapeResult {
    const markdown = data.markdown ?? data.data?.markdown ?? '';
    const html = data.html ?? data.data?.html ?? '';
    const metadata: FirecrawlMetadata =
      data.metadata ?? data.data?.metadata ?? {};
    return {
      url: metadata.sourceURL ?? metadata.url ?? sourceUrl,
      title: metadata.title ?? '',
      description: metadata.description ?? '',
      markdown,
      html,
      links: data.links ?? data.data?.links ?? [],
      metadata: {
        ...metadata,
        title: metadata.title ?? '',
        description: metadata.description ?? '',
        language: metadata.language ?? '',
        keywords: metadata.keywords ?? [],
        robots: metadata.robots ?? '',
        ogImage: metadata.ogImage ?? '',
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export interface FirecrawlScrapeResult {
  url: string;
  title: string;
  description: string;
  markdown: string;
  html: string;
  links?: string[];
  metadata: Record<string, any>;
}
