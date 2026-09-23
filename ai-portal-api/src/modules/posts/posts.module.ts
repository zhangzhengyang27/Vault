import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { PostLike } from '../../entities/post-like.entity';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostLike]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
