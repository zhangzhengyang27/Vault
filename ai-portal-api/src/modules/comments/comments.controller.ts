import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("posts/:postId/comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findByPost(@Param("postId") postId: string, @Query("sort") sort?: string) {
    return this.commentsService.findByPost(
      Number(postId),
      sort === "hot" ? "hot" : "latest",
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param("postId") postId: string,
    @CurrentUser() user: { id: number; username: string },
    @Body() body: CreateCommentDto,
  ) {
    return this.commentsService.create(Number(postId), body, user);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: { id: number; role?: string },
  ) {
    return this.commentsService.remove(Number(id), user);
  }
}

/** 通用评论：支持 tool / prompt / article / news / post 等任意目标 */
@Controller("comments")
export class GenericCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findByTarget(
    @Query("targetType") targetType: string,
    @Query("targetId") targetId: string,
  ) {
    return this.commentsService.findByTarget(targetType, Number(targetId));
  }

  /** 批量回填当前用户已点赞的评论 id（必须先于 GET :id 语义考虑，此处无 GET :id 路由） */
  @Get("liked")
  @UseGuards(JwtAuthGuard)
  liked(@CurrentUser() user: { id: number }, @Query("ids") ids?: string) {
    const commentIds = (ids ?? "")
      .split(",")
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 100);
    return this.commentsService.likedCommentIds(user.id, commentIds);
  }

  /** 评论点赞/取消赞（幂等切换） */
  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @Param("id") id: string,
    @CurrentUser() user: { id: number; username: string },
  ) {
    return this.commentsService.toggleLike(Number(id), user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Query("targetType") targetType: string,
    @Query("targetId") targetId: string,
    @CurrentUser() user: { id: number; username: string },
    @Body() body: CreateCommentDto,
  ) {
    return this.commentsService.createForTarget(
      targetType,
      Number(targetId),
      body,
      user,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: { id: number; role?: string },
  ) {
    return this.commentsService.remove(Number(id), user);
  }
}
