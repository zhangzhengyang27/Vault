import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import * as crypto from "crypto";
import { isIP } from "net";
import { lookup } from "dns/promises";
import { URL } from "url";
import { Agent as HttpAgent, request as httpRequest } from "http";
import { Agent as HttpsAgent, request as httpsRequest } from "https";
import Parser from "rss-parser";
import sanitizeHtmlLib from "sanitize-html";
import { Source } from "../../entities/source.entity";
import { CrawlLog } from "../../entities/crawl-log.entity";
import { News } from "../../entities/news.entity";
import { Tool } from "../../entities/tool.entity";
import { Prompt } from "../../entities/prompt.entity";
import { Repo } from "../../entities/repo.entity";
import { Article } from "../../entities/article.entity";
import { Mcp } from "../../entities/mcp.entity";
import { Resource } from "../../entities/resource.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { classifyNewsCategory } from "../news/news-categories";
import {
  FirecrawlService,
  type FirecrawlScrapeResult,
} from "./firecrawl.service";
import { buildFixedLookup } from "../../common/fixed-lookup";
import { CreateSourceDto } from "./dto/create-source.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";

/**
 * 审核队列条目的通用形状。
 * news/tool/prompt/github/knowledge 五类内容的字段名并不一致，
 * 统一用「最小公共形状 + 索引签名」承接，避免 any 扩散。
 */
interface ReviewableItem {
  id: number;
  status: string;
  slug?: string;
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  category?: { name?: string } | null;
  [field: string]: unknown;
}

type RssItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
  categories?: string[];
  pubDate?: string;
};

const INTERVAL_CRON: Record<string, string> = {
  minutely: "0 * * * * *",
  hourly: "0 0 * * * *",
  daily: "0 0 6 * * *",
  // 周一 4 点：避开 daily 的 6 点整点，防止同一天两个调度重复抓同一批源
  weekly: "0 0 4 * * 1",
};

/**
 * 自动采集管道：
 * 1) 按配置的频率（minutely/hourly/daily/weekly）定时调度采集；
 * 2) RSS/Atom 抓取 → 清洗 → 标题指纹去重 → AI 摘要 → 分类打标；
 * 3) 落库默认免审直发（published）；设 CRAWLER_AUTO_PUBLISH=false 可恢复
 *    「先进审核队列（pending），管理员审核后发布」的旧行为。已发布条目
 *    仍可在后台「采集审核」页下架（reject）；
 * 4) 每次任务记录采集日志（crawl_logs）。
 */
@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  /** 采集内容是否免审直发：默认 true；显式设 CRAWLER_AUTO_PUBLISH=false 恢复先审后发 */
  private readonly autoPublish = process.env.CRAWLER_AUTO_PUBLISH !== "false";
  private readonly parser = new Parser({
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AiPortalCrawler/1.0; +https://example.com)",
      Accept: "application/rss+xml, application/atom+xml, application/xml",
    },
  });

  // 采集互斥锁 key（PostgreSQL advisory lock 的整数标识）
  private readonly LOCK_KEY = 0x41495043; // "AIPC" 的 ASCII hex

  /** 判断 IP 是否为私网/环回/链路本地/保留地址（SSRF 防护） */
  private isBlockedIp(ip: string): boolean {
    if (isIP(ip) === 4) {
      const parts = ip.split(".").map(Number);
      const [a, b] = parts;
      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
        (a === 169 && b === 254) || // 链路本地（含云元数据 169.254.169.254）
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) ||
        (a === 198 && b >= 18 && b <= 19) // 基准测试保留 198.18.0.0/15
      );
    }
    if (isIP(ip) === 6) {
      const lower = ip.toLowerCase();
      // IPv4-mapped IPv6（::ffff:127.0.0.1 或十六进制 ::ffff:7f00:1）还原为 IPv4 再判断
      const mapped = lower.match(
        /^::ffff:(?:(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/,
      );
      if (mapped) {
        const v4 = mapped[1]
          ? mapped[1]
          : [
              parseInt(mapped[2], 16) >> 8,
              parseInt(mapped[2], 16) & 0xff,
              parseInt(mapped[3], 16) >> 8,
              parseInt(mapped[3], 16) & 0xff,
            ].join(".");
        return this.isBlockedIp(v4);
      }
      return (
        lower === "::1" ||
        lower === "::" ||
        lower.startsWith("fc") ||
        lower.startsWith("fd") || // 唯一本地地址 ULA fc00::/7
        lower.startsWith("fe80:") || // 链路本地 fe80::/10
        lower.startsWith("::ffff:") // 其余映射形式（含 169.254 等点分变体）
      );
    }
    // 非 IP 地址不拦截（调用方已通过 dns.lookup 解析，理论上不会走到这里）
    return false;
  }

  /**
   * SSRF 防护：校验采集 URL 的协议并解析域名，
   * 拒绝指向私网/环回/链路本地/保留地址的请求，防止内网探测。
   * 返回校验通过的地址列表，供后续「固定 IP 发请求」使用。
   */
  private async assertSafeSourceUrl(rawUrl: string): Promise<string[]> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`非法 URL: ${rawUrl}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new BadRequestException(`不支持的协议: ${parsed.protocol}`);
    }
    const hostname = parsed.hostname;
    // 本地主机名直接拒绝
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      throw new BadRequestException(`禁止访问本地地址: ${hostname}`);
    }
    let addresses: string[];
    try {
      const res = await lookup(hostname, { all: true, verbatim: true });
      addresses = res.map((a) => a.address);
    } catch {
      throw new BadRequestException(`域名解析失败: ${hostname}`);
    }
    for (const addr of addresses) {
      if (this.isBlockedIp(addr)) {
        throw new BadRequestException(`禁止访问私网地址: ${addr}`);
      }
    }
    return addresses;
  }

  /**
   * 以「已校验的 IP」抓取 RSS 内容：自定义 agent 固定 lookup 结果，
   * 堵住「校验时解析一次、真正请求时又被 rebinding 到内网 IP」的 TOCTOU 窗口。
   */
  private fetchFeed(url: string, allowedIps: string[]): Promise<string> {
    const isHttps = new URL(url).protocol === "https:";
    const AgentCtor = isHttps ? HttpsAgent : HttpAgent;
    if (allowedIps.length === 0) {
      return Promise.reject(new Error(`没有可用的已校验地址: ${url}`));
    }
    const agent = new AgentCtor({
      // lookup 固定返回已校验地址，杜绝二次 DNS 解析
      // （兼容 Node >= 20 的 autoSelectFamily，见 common/fixed-lookup.ts）
      lookup: buildFixedLookup(allowedIps),
    });

    return new Promise<string>((resolve, reject) => {
      const req = (isHttps ? httpsRequest : httpRequest)(
        url,
        {
          agent,
          timeout: 15000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AiPortalCrawler/1.0; +https://example.com)",
            Accept:
              "application/rss+xml, application/atom+xml, application/xml",
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            res.resume();
            reject(new Error(`源站返回 HTTP ${status}`));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 10 * 1024 * 1024) {
              req.destroy(new Error("响应体超过 10MB，已中断"));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          res.on("error", reject);
        },
      );
      req.on("timeout", () => req.destroy(new Error("请求超时")));
      req.on("error", reject);
      // GET 无请求体也必须显式 end，否则请求永不发出、socket 直至超时
      // （2026-09 重建本文件时遗漏此行，导致所有数据源采集必然「请求超时」）
      req.end();
    });
  }

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(CrawlLog)
    private readonly logRepo: Repository<CrawlLog>,
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
    @InjectRepository(Tool)
    private readonly toolRepo: Repository<Tool>,
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(Repo)
    private readonly repoRepo: Repository<Repo>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Mcp)
    private readonly mcpRepo: Repository<Mcp>,
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    private readonly dataSource: DataSource,
    private readonly firecrawl: FirecrawlService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 尝试获取 PostgreSQL 分布式 advisory lock（多实例安全）。
   * 返回 queryRunner（持有锁的连接），获取失败返回 null。
   * key 可派生单源锁（全局键 + sourceId），实现「单源」与「全量」两级互斥。
   */
  private async acquireDistributedLock(key = this.LOCK_KEY) {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    const result = (await runner.query(
      `SELECT pg_try_advisory_lock(${key}) AS locked`,
    )) as { locked?: boolean }[];
    if (result[0]?.locked) {
      return runner;
    }
    await runner.release();
    return null;
  }

  private async releaseDistributedLock(
    runner: {
      query: (sql: string) => Promise<any>;
      release: () => Promise<void>;
    },
    key = this.LOCK_KEY,
  ) {
    try {
      await runner.query(`SELECT pg_advisory_unlock(${key})`);
    } finally {
      await runner.release();
    }
  }

  /* ------------------------- 定时调度 ------------------------- */

  // 每天凌晨清理 30 天前的采集日志，防止日志表无限膨胀
  @Cron("0 30 3 * * *")
  async cleanOldLogs() {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.logRepo
        .createQueryBuilder("log")
        .delete()
        .where("log.createdAt < :cutoff", { cutoff })
        .execute();
      if (result.affected) {
        this.logger.log(`已清理 ${result.affected} 条过期采集日志`);
      }
    } catch (err) {
      this.logger.error(`清理采集日志失败: ${(err as Error).message}`);
    }
  }

  @Cron(INTERVAL_CRON.minutely)
  async cronMinutely() {
    await this.crawlByIntervals(["minutely"]);
  }

  @Cron(INTERVAL_CRON.hourly)
  async cronHourly() {
    await this.crawlByIntervals(["minutely", "hourly"]);
  }

  @Cron(INTERVAL_CRON.daily)
  async cronDaily() {
    await this.crawlByIntervals(["minutely", "hourly", "daily"]);
  }

  @Cron(INTERVAL_CRON.weekly)
  async cronWeekly() {
    await this.crawlByIntervals(["minutely", "hourly", "daily", "weekly"]);
  }

  private async crawlByIntervals(intervals: string[]) {
    // 分布式锁：多实例部署时避免采集任务重叠
    const lock = await this.acquireDistributedLock();
    if (!lock) {
      this.logger.warn("采集任务正在运行（其他实例持有锁），跳过本次调度");
      return;
    }
    try {
      const sources = await this.sourceRepo.find({
        // 不按 status 过滤：失败源（status=error）也要参与调度重试，
        // 否则一次瞬时故障就把源永久踢出采集队列
        where: { enabled: true },
      });
      for (const source of sources) {
        if (intervals.includes(source.crawlInterval)) {
          try {
            await this.crawlSource(source.id);
          } catch (err) {
            this.logger.error(
              `定时采集源 #${source.id} (${source.name}) 失败: ${(err as Error).message}`,
            );
          }
        }
      }
    } finally {
      await this.releaseDistributedLock(lock);
    }
  }

  /* ------------------------- 采集执行 ------------------------- */

  async crawlAll() {
    const lock = await this.acquireDistributedLock();
    if (!lock) {
      return { skipped: true, message: "采集任务正在运行（其他实例持有锁）" };
    }
    try {
      const sources = await this.sourceRepo.find({
        // 不按 status 过滤：失败源（status=error）也要参与调度重试，
        // 否则一次瞬时故障就把源永久踢出采集队列
        where: { enabled: true },
      });
      const results: { sourceId: number; status: string; newCount: number }[] =
        [];
      for (const source of sources) {
        try {
          const r = await this.crawlSource(source.id);
          results.push({
            sourceId: source.id,
            status: r.status,
            newCount: r.newCount,
          });
        } catch {
          results.push({ sourceId: source.id, status: "failed", newCount: 0 });
        }
      }
      return results;
    } finally {
      await this.releaseDistributedLock(lock);
    }
  }

  async crawlSource(sourceId: number) {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) throw new NotFoundException(`数据源 #${sourceId} 不存在`);
    if (!source.enabled) {
      throw new BadRequestException(`数据源 ${source.name} 已停用`);
    }

    // 单源互斥锁：手动触发不再绕过互斥，避免与定时任务/其他手动触发重叠执行
    const sourceLockKey = this.LOCK_KEY + sourceId;
    const lock = await this.acquireDistributedLock(sourceLockKey);
    if (!lock) {
      return {
        status: "skipped",
        newCount: 0,
        duplicateCount: 0,
        message: "该数据源的采集正在进行中，请稍后再试",
      };
    }
    try {
      return await this.doCrawlSource(source);
    } finally {
      await this.releaseDistributedLock(lock, sourceLockKey);
    }
  }

  private async doCrawlSource(source: Source) {
    const sourceId = source.id;
    const startedAt = Date.now();
    let status = "success";
    let error: string | null = null;
    let fetchedCount = 0;
    let newCount = 0;
    let duplicateCount = 0;

    try {
      // SSRF 防护：拒绝私网/本地地址，并以校验通过的 IP 发起请求（防 DNS rebinding）
      const allowedIps = await this.assertSafeSourceUrl(source.url);
      const xml = await this.fetchFeed(source.url, allowedIps);
      const feed = await this.parser.parseString(xml);
      const items = (feed.items ?? []) as RssItem[];
      fetchedCount = items.length;

      // 预取本类型已有的标题集合，避免对每个 item 逐条查库（N+1）
      const existingTitles = await this.loadExistingTitles(source.sourceType);
      const seenInBatch = new Set<string>();

      for (const item of items) {
        if (!item.title || !item.title.trim()) continue;
        const title = this.cleanTitle(item.title);
        if (!title) continue;

        if (existingTitles.has(title) || seenInBatch.has(title)) {
          duplicateCount++;
          continue;
        }

        const saved = await this.saveItem(source.sourceType, item, title);
        if (saved) {
          newCount++;
          seenInBatch.add(title);
        } else {
          duplicateCount++;
        }
      }
    } catch (err) {
      status = "failed";
      error = (err as Error).message;
      this.logger.error(
        `采集数据源 ${source.name} (${source.url}) 失败: ${error}`,
      );
    }

    // 更新数据源统计与日志（计数用 SQL 自增，避免并发下基于过期快照的丢更新）
    await this.sourceRepo.update(sourceId, {
      lastCrawledAt: new Date(),
      lastError: error ?? "",
      status: status === "failed" ? "error" : "active",
      ...(status === "failed"
        ? { failCount: () => '"failCount" + 1' }
        : { successCount: () => '"successCount" + 1' }),
    });

    const log = await this.logRepo.save(
      this.logRepo.create({
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.sourceType,
        status:
          status === "failed"
            ? "failed"
            : duplicateCount > 0 && newCount === 0
              ? "partial"
              : "success",
        fetchedCount,
        newCount,
        duplicateCount,
        error,
        durationMs: Date.now() - startedAt,
      }),
    );

    this.logger.log(
      `采集 ${source.name}: 抓取 ${fetchedCount}, 新增 ${newCount}, 去重 ${duplicateCount}`,
    );
    return { status, newCount, duplicateCount, log };
  }

  /* ------------------------- 清洗与去重 ------------------------- */

  private cleanTitle(title: string): string {
    return title.replace(/\s+/g, " ").trim();
  }

  /** 预取指定内容类型最近的标题集合用于批内去重（限制条数避免内存膨胀，唯一约束兜底） */
  private async loadExistingTitles(sourceType: string): Promise<Set<string>> {
    const set = new Set<string>();
    const TAKE = 5000;
    try {
      switch (sourceType) {
        case "news": {
          const rows = await this.newsRepo.find({
            select: { title: true },
            order: { id: "DESC" },
            take: TAKE,
          });
          for (const r of rows) if (r.title) set.add(r.title);
          break;
        }
        case "tool": {
          const rows = await this.toolRepo.find({
            select: { name: true },
            order: { id: "DESC" },
            take: TAKE,
          });
          for (const r of rows) if (r.name) set.add(r.name);
          break;
        }
        case "prompt": {
          const rows = await this.promptRepo.find({
            select: { title: true },
            order: { id: "DESC" },
            take: TAKE,
          });
          for (const r of rows) if (r.title) set.add(r.title);
          break;
        }
        case "github": {
          const rows = await this.repoRepo.find({
            select: { name: true },
            order: { id: "DESC" },
            take: TAKE,
          });
          for (const r of rows) if (r.name) set.add(r.name);
          break;
        }
        default: {
          const rows = await this.articleRepo.find({
            select: { title: true },
            order: { id: "DESC" },
            take: TAKE,
          });
          for (const r of rows) if (r.title) set.add(r.title);
        }
      }
    } catch {
      // 预取失败时降级为空集合，依赖后续 save 的唯一约束兜底
    }
    return set;
  }

  private makeSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
    const hash = crypto
      .createHash("sha1")
      .update(title)
      .digest("hex")
      .slice(0, 8);
    return `${base || "item"}-${hash}`;
  }

  /**
   * 摘要：截取正文前 150 字并标注「AI 摘要」（接入大模型后可替换为结构化摘要）。
   * 入参须为 htmlToText 产出的纯文本；空文本返回空串（列表/详情页不渲染摘要行）。
   */
  private generateSummary(text: string): string {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return "";
    const summary = clean.slice(0, 150) + (clean.length > 150 ? "…" : "");
    return `【AI 摘要】${summary}`;
  }

  /** HTML → 纯文本：先过 XSS 白名单，块级标签转换行，再剥掉全部标签并解码实体 */
  private htmlToText(raw?: string): string {
    if (!raw) return "";
    const withBreaks = this.sanitizeHtml(raw)
      .replace(/<\/?(p|div|li|h[1-6]|blockquote|tr|section|article)\b[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n");
    return sanitizeHtmlLib(withBreaks, { allowedTags: [], allowedAttributes: {} })
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /** 识别「链接桩」正文：剥掉查看原文类短语后几乎不剩文字即视为无正文 */
  private isLinkStub(text: string): boolean {
    if (!text) return true;
    const stripped = text
      .replace(/点击查看原文|查看原文|阅读原文|阅读更多|全文|read more|continue reading/gi, "")
      .replace(/[\s>»›·|.[\]()（）\-—–~、，。：:;；！!？?]/g, "");
    return stripped.length < 10;
  }

  /** 校验链接是否为 github.com/<owner>/<repo> 仓库主页（博客/文档类条目一律拒绝） */
  private isRepoLink(link?: string): boolean {
    if (!link) return false;
    try {
      const u = new URL(link);
      if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
        return false;
      }
      return u.pathname.split("/").filter(Boolean).length === 2;
    } catch {
      return false;
    }
  }

  /** HTML 清洗：allowlist 白名单，剥离脚本/事件属性/javascript: 链接，防止存储型 XSS */
  private sanitizeHtml(raw?: string): string {
    if (!raw) return "";
    return sanitizeHtmlLib(raw, {
      allowedTags: [
        ...sanitizeHtmlLib.defaults.allowedTags,
        "img",
        "figure",
        "figcaption",
        "mark",
        "del",
        "ins",
      ],
      allowedAttributes: {
        ...sanitizeHtmlLib.defaults.allowedAttributes,
        img: ["src", "alt", "title", "loading"],
        a: ["href", "name", "target", "title", "rel"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      // 外链强制加 rel，防钓鱼与 opener 攻击
      transformTags: {
        a: sanitizeHtmlLib.simpleTransform("a", {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        }),
      },
      disallowedTagsMode: "discard",
    }).trim();
  }

  private extractTime(item: RssItem): string {
    return (item.isoDate ?? item.pubDate ?? new Date().toISOString()).slice(
      0,
      10,
    );
  }

  /* ------------------------- 落库（免审直发或进审核队列） ------------------------- */

  /** 采集内容初始状态：默认免审直发 published；CRAWLER_AUTO_PUBLISH=false 时进审核队列 */
  private initialStatus(): "published" | "pending" {
    return this.autoPublish ? "published" : "pending";
  }

  private async saveItem(
    sourceType: string,
    item: RssItem,
    title: string,
  ): Promise<boolean> {
    const slug = this.makeSlug(title);
    // 正文统一转纯文本（前台按纯文本渲染，存 HTML 会原样露出）；
    // InfoQ 等 RSS 只给「查看原文」链接桩，识别后置空，详情页走 sourceUrl 的查看原文按钮
    const bodyText = this.htmlToText(item.content ?? item.contentSnippet);
    const isStub = this.isLinkStub(bodyText);
    const summary = isStub ? "" : this.generateSummary(bodyText);
    const content = isStub ? undefined : bodyText;
    const tags = this.mapTags(item.categories);

    switch (sourceType) {
      case "news":
        return this.saveSafe(() =>
          this.newsRepo.save(
            this.newsRepo.create({
              slug,
              title,
              summary,
              content,
              time: this.extractTime(item),
              sourceUrl: item.link || undefined,
              tags: tags.length ? tags : undefined,
              category: classifyNewsCategory({ title, summary, tags }),
              status: this.initialStatus(),
              phase: "crawl",
            }),
          ),
        );
      case "tool":
        return this.saveSafe(() =>
          this.toolRepo.save(
            this.toolRepo.create({
              slug,
              name: title,
              description: summary,
              content: content ?? "",
              tags,
              status: this.initialStatus(),
              phase: "crawl",
            }),
          ),
        );
      case "prompt":
        return this.saveSafe(() =>
          this.promptRepo.save(
            this.promptRepo.create({
              slug,
              title,
              description: summary,
              content: content ?? "",
              source: "crawl",
              status: this.initialStatus(),
              phase: "crawl",
            }),
          ),
        );
      case "github": {
        // github 类型的语义是「仓库」：只收 github.com/<owner>/<repo> 主页链接的条目。
        // RSS 博客（如 GitHub Blog）没有仓库链接，混进 repos 表会成为无 stars 的
        // 伪仓库污染 /github 列表（2026-09-14 已清理过一批，见 sql/2026-09-14-github-cleanup.sql）。
        if (!this.isRepoLink(item.link)) {
          this.logger.warn(
            `github 源包含非仓库链接，已跳过: ${title} (${item.link ?? "无链接"})`,
          );
          return false;
        }
        // description 与 tool/prompt 一致用剥过标签的 summary，
        // 避免 RSS 正文 HTML 以纯文本形式暴露在列表/详情页
        return this.saveSafe(() =>
          this.repoRepo.save(
            this.repoRepo.create({
              slug,
              name: title,
              description: summary,
              phase: "crawl",
              status: this.initialStatus(), // 免审直发 published / 进审核队列 pending
            }),
          ),
        );
      }
      default:
        return this.saveSafe(() =>
          this.articleRepo.save(
            this.articleRepo.create({
              slug,
              title,
              summary,
              content,
              status: this.initialStatus(),
              phase: "crawl",
            }),
          ),
        );
    }
  }

  /** 唯一约束冲突（重复）时返回 false，不中断整批采集 */
  private async saveSafe<T>(fn: () => Promise<T>): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch {
      return false;
    }
  }

  /** 分类打标：RSS categories → 站内标签 */
  private mapTags(categories?: string[]): string[] {
    if (!categories || categories.length === 0) return [];
    const blacklist = new Set(["ai", "人工智能", "news"]);
    return categories
      .map((c) => c.trim())
      .filter((c) => c.length <= 20 && !blacklist.has(c.toLowerCase()))
      .slice(0, 5);
  }

  /* ------------------------- 管理查询 ------------------------- */

  async findAllSources() {
    return this.sourceRepo.find({ order: { id: "DESC" } });
  }

  async findLogs(limit = 50) {
    // 钳制到 [1, 200]，防止 ?limit=99999999 拖垮数据库或 NaN/负数产生非法 SQL
    const safe = Math.min(200, Math.max(1, Math.floor(Number(limit)) || 50));
    return this.logRepo.find({ order: { id: "DESC" }, take: safe });
  }

  async createSource(dto: CreateSourceDto) {
    return this.sourceRepo.save(this.sourceRepo.create(dto));
  }

  async updateSource(id: number, dto: UpdateSourceDto) {
    const source = await this.sourceRepo.findOne({ where: { id } });
    if (!source) throw new NotFoundException(`数据源 #${id} 不存在`);
    Object.assign(source, dto);
    return this.sourceRepo.save(source);
  }

  async removeSource(id: number) {
    const source = await this.sourceRepo.findOne({ where: { id } });
    if (!source) throw new NotFoundException(`数据源 #${id} 不存在`);
    await this.sourceRepo.remove(source);
    return { success: true };
  }

  /** 审核队列：按内容类型与状态查询待审核的采集内容 */
  async findQueue(sourceType: string, status: string) {
    const targets: Record<string, Repository<any>> = {
      news: this.newsRepo,
      tool: this.toolRepo,
      prompt: this.promptRepo,
      github: this.repoRepo,
      knowledge: this.articleRepo,
      mcp: this.mcpRepo,
      resource: this.resourceRepo,
    };
    const repo = targets[sourceType];
    if (!repo) throw new BadRequestException(`不支持的内容类型: ${sourceType}`);
    return repo.find({
      where: { status },
      order: { id: "DESC" },
      take: 100,
    });
  }

  /* ------------------------- 审核队列（采集内容发布/拒绝） ------------------------- */

  async reviewItem(
    sourceType: string,
    id: number,
    action: "approve" | "reject",
  ): Promise<boolean> {
    const targets: Record<string, Repository<any>> = {
      news: this.newsRepo,
      tool: this.toolRepo,
      prompt: this.promptRepo,
      github: this.repoRepo,
      knowledge: this.articleRepo,
      mcp: this.mcpRepo,
      resource: this.resourceRepo,
    };
    const repo = targets[sourceType];
    if (!repo) throw new BadRequestException(`不支持的内容类型: ${sourceType}`);
    // approve 仅允许 pending：重复 approve 会向订阅者重复推送；
    // reject 额外允许 published（即「下架」，配合采集免审直发的常规操作）
    const item = (await repo.findOne({
      where: {
        id,
        status: action === "approve" ? "pending" : In(["pending", "published"]),
      },
    })) as ReviewableItem | null;
    if (!item) return false;
    item.status = action === "approve" ? "published" : "rejected";
    await repo.save(item);

    // 审核通过 = 正式发布，触发订阅匹配推送（失败不影响审核结果）
    if (action === "approve") {
      try {
        const rawTags = item.tags;
        await this.notificationsService.notifyContentPublished({
          type: sourceType === "github" ? "repo" : sourceType,
          id: item.id,
          title: item.title ?? item.name ?? "",
          slug: item.slug ?? null,
          description: item.description ?? item.summary ?? null,
          tags: Array.isArray(rawTags) ? (rawTags as string[]) : null,
          categoryName: item.category?.name ?? null,
        });
      } catch (err) {
        this.logger.error(
          `采集内容 #${id} 发布后的订阅推送失败: ${(err as Error).message}`,
        );
      }
    }
    return true;
  }

  /**
   * 批量审核：一次处理多条待审内容，解决单条审核无法清空积压队列的问题。
   *
   * - 传 `ids` 时只处理指定条目（传空数组表示不处理任何内容）；不传 `ids`
   *   才处理该类型下所有匹配 `status` 的条目（受 `limit` 约束）。
   * - 为避免向订阅者推送上千条历史内容，批量操作**不触发订阅通知**；
   *   需要通知时请走单条审核接口。
   * - 返回本次处理条数与队列剩余待审数，便于前端提示「继续处理下一批」。
   */
  async reviewBatch(
    sourceType: string,
    action: "approve" | "reject",
    options: { ids?: number[]; status?: string; limit?: number } = {},
  ): Promise<{ updated: number; remaining: number }> {
    const targets: Record<string, Repository<any>> = {
      news: this.newsRepo,
      tool: this.toolRepo,
      prompt: this.promptRepo,
      github: this.repoRepo,
      knowledge: this.articleRepo,
      mcp: this.mcpRepo,
      resource: this.resourceRepo,
    };
    const repo = targets[sourceType];
    if (!repo) throw new BadRequestException(`不支持的内容类型: ${sourceType}`);

    const status = options.status ?? "pending";
    const next = action === "approve" ? "published" : "rejected";
    // 单次上限，避免一次请求改动过多数据造成长事务
    const limit = Math.min(Math.max(options.limit ?? 500, 1), 2000);

    // 严格区分「未传 ids」（整批处理）与「传了 ids 但为空/全非法」（不处理任何内容）。
    // 否则调用方传一个空数组时会被误解为整批操作，可能误伤全部数据。
    const scoped = options.ids !== undefined;
    let ids = (options.ids ?? [])
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, limit);

    if (!scoped) {
      const rows = (await repo.find({
        where: { status },
        select: { id: true },
        order: { id: "DESC" },
        take: limit,
      })) as { id: number }[];
      ids = rows.map((r) => r.id);
    }

    if (ids.length === 0) {
      return { updated: 0, remaining: await repo.count({ where: { status } }) };
    }

    // approve 仅翻 pending（防重复推送）；reject 额外允许下架已发布内容
    const fromStatuses =
      action === "approve" ? ["pending"] : ["pending", "published"];
    await repo.update(
      { id: In(ids), status: In(fromStatuses) },
      { status: next },
    );

    const remaining = await repo.count({ where: { status } });
    this.logger.log(
      `批量审核: type=${sourceType} action=${action} updated=${ids.length} remaining=${remaining}`,
    );
    return { updated: ids.length, remaining };
  }

  /* ------------------------- Firecrawl 网页抓取 ------------------------- */

  /** 返回 Firecrawl 服务配置状态（是否可用、使用哪种模式） */
  getFirecrawlStatus() {
    return {
      available: this.firecrawl.isAvailable(),
      mode: this.firecrawl.getMode(),
    };
  }

  /**
   * 单页抓取：将 URL 转换为干净的 Markdown。
   * 复用 SSRF 防护逻辑，拒绝私网地址。
   */
  async scrapeWebpage(url: string): Promise<FirecrawlScrapeResult> {
    if (!this.firecrawl.isAvailable()) {
      throw new ServiceUnavailableException(
        "Firecrawl 未配置：请在 .env 中设置 FIRECRAWL_API_KEY 或 FIRECRAWL_BASE_URL",
      );
    }
    await this.assertSafeSourceUrl(url);
    const result = await this.firecrawl.scrapeUrl(url, {
      formats: ["markdown", "html"],
      onlyMainContent: true,
    });
    this.logger.log(
      `Firecrawl 抓取成功: ${url} (${result.markdown.length} chars)`,
    );
    return result;
  }

  /**
   * 批量爬取：从入口 URL 出发爬取整个站点，等待完成后返回所有页面。
   * 适用于一次性导入某个博客 / 文档站的全部内容。
   */
  async crawlWebsite(
    url: string,
    options: { limit?: number; maxDepth?: number } = {},
  ): Promise<FirecrawlScrapeResult[]> {
    if (!this.firecrawl.isAvailable()) {
      throw new ServiceUnavailableException("Firecrawl 未配置");
    }
    await this.assertSafeSourceUrl(url);
    this.logger.log(
      `Firecrawl 批量爬取启动: ${url} (limit=${options.limit ?? 50}, depth=${options.maxDepth ?? 2})`,
    );
    const results = await this.firecrawl.crawlAndWait(url, {
      limit: options.limit ?? 50,
      maxDepth: options.maxDepth ?? 2,
    });
    this.logger.log(`Firecrawl 批量爬取完成: ${url} (${results.length} pages)`);
    return results;
  }

  /**
   * 将 Firecrawl 抓取结果转为文章并入库（进入待审核队列）。
   * 用于「一键导入网页内容」场景：抓取 → 清洗 → 落库 → 审核发布。
   */
  async importWebpageAsArticle(
    url: string,
    sourceType: "news" | "knowledge" = "knowledge",
  ): Promise<{ success: boolean; title: string; slug: string }> {
    const result = await this.scrapeWebpage(url);
    const title =
      result.title ||
      this.extractTitleFromMarkdown(result.markdown) ||
      "未命名文章";
    const slug = this.makeSlug(title);
    const summary = this.generateSummary(result.markdown);
    const content = this.sanitizeHtml(result.html) || result.markdown;

    const repo = (
      sourceType === "news" ? this.newsRepo : this.articleRepo
    ) as Repository<any>;
    const entity: Record<string, any> = {
      slug,
      title,
      summary,
      content,
      status: "pending",
      phase: "firecrawl",
    };
    if (sourceType === "news") {
      entity.time = new Date().toISOString().slice(0, 10);
      entity.sourceUrl = url;
      entity.category = classifyNewsCategory({ title, summary });
    }
    const saved = await this.saveSafe(() => repo.save(repo.create(entity)));
    if (!saved) {
      // 去重兜底触发（相同标题指纹已存在）：如实报告，而不是返回一个解析不到的 slug
      throw new ConflictException("相同标题的内容已存在，导入被去重规则跳过");
    }

    this.logger.log(`Firecrawl 导入文章: ${title} (${slug})`);
    return { success: true, title, slug };
  }

  /** 从 Markdown 中提取第一个 # 标题作为 fallback */
  private extractTitleFromMarkdown(md: string): string {
    const match = md.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : "";
  }
}
