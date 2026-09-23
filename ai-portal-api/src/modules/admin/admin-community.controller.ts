import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { PostsService } from "../posts/posts.service";
import { CommentsService } from "../comments/comments.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";
import { OperLogInterceptor } from "../../logs/oper-log.interceptor";
import { PostStatusDto } from "./dto/post-status.dto";

interface AdminUser {
  id: number;
  username: string;
  role: string;
}

/**
 * 社区管理：帖子 / 评论 的管理员接口。
 * 删除复用业务服务（含点赞/评论/收藏/通知的关联清理与计数回退）。
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(OperLogInterceptor)
@Roles("admin")
@Controller("admin/community")
export class AdminCommunityController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  // ---------- 帖子 ----------

  @Get("posts")
  listPosts(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("q") q?: string,
  ) {
    return this.postsService.adminList({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      q: q || undefined,
    });
  }

  /** 下架（hidden）/恢复（published）帖子 */
  @Patch("posts/:id/status")
  setPostStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: PostStatusDto,
  ) {
    return this.postsService.setStatus(id, body.status);
  }

  /** 删除帖子：级联清理点赞/评论/收藏/通知 */
  @Delete("posts/:id")
  removePost(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AdminUser,
  ) {
    return this.postsService.remove(id, user);
  }

  // ---------- 评论 ----------

  @Get("comments")
  listComments(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("q") q?: string,
    @Query("targetType") targetType?: string,
  ) {
    return this.commentsService.adminList({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      q: q || undefined,
      targetType: targetType || undefined,
    });
  }

  /** 删除评论（帖子评论会回退帖子计数） */
  @Delete("comments/:id")
  removeComment(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AdminUser,
  ) {
    return this.commentsService.remove(id, user);
  }
}
