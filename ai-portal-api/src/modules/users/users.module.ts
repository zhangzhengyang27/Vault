import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { Submission } from '../../entities/submission.entity';
import { Comment } from '../../entities/comment.entity';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { Article } from '../../entities/article.entity';
import { News } from '../../entities/news.entity';
import { Repo } from '../../entities/repo.entity';
import { Resource } from '../../entities/resource.entity';
import { Mcp } from '../../entities/mcp.entity';
import { Post } from '../../entities/post.entity';
import { Follow } from '../../entities/follow.entity';
import { AuthModule } from '../../auth/auth.module';

// UsersService 需要按内容类型批量解析 slug（用户主页投稿/评论跳转），注册全部目标仓储
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Submission,
      Comment,
      Tool,
      Prompt,
      Article,
      News,
      Repo,
      Resource,
      Mcp,
      Post,
      Follow,
    ]),
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
