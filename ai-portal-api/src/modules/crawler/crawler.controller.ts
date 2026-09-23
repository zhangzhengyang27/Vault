import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { ReviewBatchDto } from './dto/review-batch.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { OperLogInterceptor } from '../../logs/oper-log.interceptor';

@Controller('crawler')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@UseInterceptors(OperLogInterceptor)
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  /* ---------------- 数据源白名单管理 ---------------- */

  @Get('sources')
  findAllSources() {
    return this.crawlerService.findAllSources();
  }

  @Post('sources')
  createSource(@Body() dto: CreateSourceDto) {
    return this.crawlerService.createSource(dto);
  }

  @Patch('sources/:id')
  updateSource(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.crawlerService.updateSource(Number(id), dto);
  }

  @Delete('sources/:id')
  removeSource(@Param('id') id: string) {
    return this.crawlerService.removeSource(Number(id));
  }

  /* ---------------- 手动触发采集 ---------------- */

  @Post('run')
  crawlAll() {
    return this.crawlerService.crawlAll();
  }

  @Post('sources/:id/run')
  crawlOne(@Param('id') id: string) {
    return this.crawlerService.crawlSource(Number(id));
  }

  /* ---------------- 采集日志 ---------------- */

  @Get('logs')
  findLogs(@Query('limit') limit?: string) {
    return this.crawlerService.findLogs(limit ? Number(limit) : 50);
  }

  /* ---------------- 采集内容审核队列 ---------------- */

  @Get('review/:type')
  reviewQueue(@Param('type') type: string, @Query('status') status?: string) {
    return this.crawlerService.findQueue(type, status ?? 'pending');
  }

  @Patch('review/:type/:id/:action')
  reviewItem(
    @Param('type') type: string,
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject',
  ) {
    return this.crawlerService.reviewItem(type, Number(id), action);
  }

  /**
   * 批量审核：一次通过/驳回多条，用于清空积压队列。
   * 传 ids 只处理指定条目；不传则处理该类型下全部 status（默认 pending）匹配项。
   */
  @Post('review/:type/batch')
  reviewBatch(@Param('type') type: string, @Body() dto: ReviewBatchDto) {
    return this.crawlerService.reviewBatch(type, dto.action, {
      ids: dto.ids,
      status: dto.status,
      limit: dto.limit,
    });
  }

  /* ---------------- Firecrawl 网页抓取 ---------------- */

  @Get('firecrawl/status')
  firecrawlStatus() {
    return this.crawlerService.getFirecrawlStatus();
  }

  @Post('firecrawl/scrape')
  scrapeWebpage(@Body() body: { url: string }) {
    return this.crawlerService.scrapeWebpage(body.url);
  }

  @Post('firecrawl/crawl')
  crawlWebsite(
    @Body() body: { url: string; limit?: number; maxDepth?: number },
  ) {
    return this.crawlerService.crawlWebsite(body.url, {
      limit: body.limit,
      maxDepth: body.maxDepth,
    });
  }

  @Post('firecrawl/import')
  importWebpage(
    @Body() body: { url: string; sourceType?: 'news' | 'knowledge' },
  ) {
    return this.crawlerService.importWebpageAsArticle(
      body.url,
      body.sourceType ?? 'knowledge',
    );
  }
}
