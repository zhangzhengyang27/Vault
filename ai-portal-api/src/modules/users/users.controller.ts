import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 推荐关注（按粉丝数排序；登录时排除自己与已关注者）
   * 注意：必须注册在 @Get(':username') 之前，否则 'suggested' 会被吞掉
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('suggested')
  suggested(@Req() req: Request, @Query('limit') limit?: string) {
    // OptionalJwtAuthGuard 匿名时不挂 user，用宽化类型读取
    const me = (req as Request & { user?: { id: number } }).user;
    return this.usersService.suggested(me?.id, limit ? Number(limit) : 5);
  }

  /**
   * 获取用户公开信息
   * GET /users/:username
   */
  @Get(':username')
  findOne(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  /**
   * 获取用户的提交列表（已通过的）
   * GET /users/:username/submissions?page=1&limit=20
   */
  @Get(':username/submissions')
  getSubmissions(
    @Param('username') username: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getUserSubmissions(
      username,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  /**
   * 获取用户的评论列表
   * GET /users/:username/comments?page=1&limit=20
   */
  @Get(':username/comments')
  getComments(
    @Param('username') username: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getUserComments(
      username,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  /**
   * 获取用户的公开帖子列表
   * GET /users/:username/posts?page=1&limit=20
   */
  @Get(':username/posts')
  getPosts(
    @Param('username') username: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getUserPosts(
      username,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
