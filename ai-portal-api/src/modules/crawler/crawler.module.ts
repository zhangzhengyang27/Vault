import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';
import { FirecrawlService } from './firecrawl.service';
import { CrawlerController } from './crawler.controller';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Source } from '../../entities/source.entity';
import { CrawlLog } from '../../entities/crawl-log.entity';
import { News } from '../../entities/news.entity';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Repo } from '../../entities/repo.entity';
import { Article } from '../../entities/article.entity';
import { Mcp } from '../../entities/mcp.entity';
import { Resource } from '../../entities/resource.entity';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([
      Source,
      CrawlLog,
      News,
      Tool,
      Prompt,
      Repo,
      Article,
      Mcp,
      Resource,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [CrawlerController],
  providers: [CrawlerService, FirecrawlService],
  exports: [CrawlerService, FirecrawlService],
})
export class CrawlerModule {}
