import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from '../../entities/submission.entity';
import { Tool } from '../../entities/tool.entity';
import { Prompt } from '../../entities/prompt.entity';
import { News } from '../../entities/news.entity';
import { Mcp } from '../../entities/mcp.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../../auth/auth.module';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Tool, Prompt, News, Mcp]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
