import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "../entities/comment.entity";
import { Favorite } from "../entities/favorite.entity";
import { Notification } from "../entities/notification.entity";
import { ContentCleanupService } from "./content-cleanup.service";

/** 全局公共模块：提供跨业务模块复用的服务（内容删除子行清理等） */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Comment, Favorite, Notification])],
  providers: [ContentCleanupService],
  exports: [ContentCleanupService],
})
export class CommonModule {}
