import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from '../../entities/comment.entity';
import { CommentLike } from '../../entities/comment-like.entity';
import { Post } from '../../entities/post.entity';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  CommentsController,
  GenericCommentsController,
} from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentLike, Post]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [CommentsController, GenericCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
