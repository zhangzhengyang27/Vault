import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Category } from './entities/category.entity';
import { Tool } from './entities/tool.entity';
import { Prompt } from './entities/prompt.entity';
import { Article } from './entities/article.entity';
import { News } from './entities/news.entity';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { Repo } from './entities/repo.entity';
import { Mcp } from './entities/mcp.entity';
import { Resource } from './entities/resource.entity';
import { Source } from './entities/source.entity';
import { ToolsModule } from './modules/tools/tools.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { NewsModule } from './modules/news/news.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SearchModule } from './modules/search/search.module';
import { ReposModule } from './modules/repos/repos.module';
import { McpsModule } from './modules/mcps/mcps.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { FavoritesModule } from './favorites/favorites.module';
import { UploadsModule } from './uploads/uploads.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { FollowsModule } from './modules/follows/follows.module';
import { MessagesModule } from './modules/messages/messages.module';
import { SeedService } from './seed/seed.service';
import { CommonModule } from './common/common.module';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 全局限流：默认 100 次/分钟/IP，防止暴力破解与滥用
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        // 缺失时直接失败并给出明确指引，避免静默连接到某个开发者的本机数据库
        if (!url) {
          throw new Error(
            '必须设置 DATABASE_URL 环境变量（PostgreSQL 连接串，见 .env.example）',
          );
        }
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          // 默认禁用自动同步，改用 migration 管理表结构；
          // 开发时如需临时启用，设置环境变量 TYPEORM_SYNCHRONIZE=true
          synchronize: config.get<string>('TYPEORM_SYNCHRONIZE') === 'true',
        };
      },
    }),
    CommonModule,
    LogsModule,
    // SeedService 依赖以下 repository，需在根模块注册（子模块未显式导出 TypeOrmModule）
    TypeOrmModule.forFeature([
      Category,
      Tool,
      Prompt,
      Article,
      News,
      User,
      Post,
      Repo,
      Mcp,
      Resource,
      Source,
    ]),
    ToolsModule,
    PromptsModule,
    ArticlesModule,
    NewsModule,
    CategoriesModule,
    SearchModule,
    ReposModule,
    McpsModule,
    ResourcesModule,
    PostsModule,
    CommentsModule,
    AdminModule,
    AuthModule,
    FavoritesModule,
    UploadsModule,
    CrawlerModule,
    SubscriptionsModule,
    NotificationsModule,
    SubmissionsModule,
    ReportsModule,
    // FollowsModule 必须先于 UsersModule 注册：其单段路由
    // GET /users/is-following-batch 若晚于 UsersController 的 :username 会被吞掉
    FollowsModule,
    MessagesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
