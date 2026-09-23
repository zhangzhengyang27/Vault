import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { FollowsService } from "./follows.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";

/** 关注体系路由，挂在 /users/:username 命名空间下 */
@Controller("users")
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  /**
   * 批量关注状态查询。
   * 注意：单段路径，必须早于 UsersController 的 @Get(':username') 注册——
   * app.module 中 FollowsModule 已置于 UsersModule 之前。
   */
  @Get("is-following-batch")
  @UseGuards(JwtAuthGuard)
  isFollowingBatch(
    @CurrentUser() user: { id: number },
    @Query("usernames") usernames?: string,
  ) {
    return this.followsService.isFollowingBatch(
      user.id,
      (usernames ?? "").split(","),
    );
  }

  /** 粉丝列表（公开） */
  @Get(":username/followers")
  followers(
    @Param("username") username: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.followsService.listFollowers(
      username,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  /** 关注列表（公开） */
  @Get(":username/following")
  following(
    @Param("username") username: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.followsService.listFollowing(
      username,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  /** 当前登录用户是否已关注 */
  @Get(":username/is-following")
  @UseGuards(JwtAuthGuard)
  isFollowing(
    @Param("username") username: string,
    @CurrentUser() user: { id: number },
  ) {
    return this.followsService.isFollowing(user.id, username);
  }

  @Post(":username/follow")
  @UseGuards(JwtAuthGuard)
  follow(
    @Param("username") username: string,
    @CurrentUser() user: { id: number; username: string },
  ) {
    return this.followsService.follow(user, username);
  }

  @Delete(":username/follow")
  @UseGuards(JwtAuthGuard)
  unfollow(
    @Param("username") username: string,
    @CurrentUser() user: { id: number },
  ) {
    return this.followsService.unfollow(user.id, username);
  }
}
