import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('tag') tag?: string,
  ) {
    return this.postsService.findAll(
      page ?? 1,
      limit ?? 20,
      sort ?? 'latest',
      tag || undefined,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: number; role?: string },
    @Body() body: CreatePostDto,
  ) {
    return this.postsService.update(Number(id), body, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { id: number; username: string },
    @Body() body: CreatePostDto,
  ) {
    return this.postsService.create(body, user);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: { id: number; username: string },
  ) {
    return this.postsService.toggleLike(Number(id), user);
  }

  @Get('liked')
  @UseGuards(JwtAuthGuard)
  liked(@CurrentUser() user: { id: number }, @Query('ids') ids?: string) {
    const postIds = (ids ?? '')
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 100);
    return this.postsService.likedPostIds(user.id, postIds);
  }

  // 注意：必须放在 @Get('liked') 之后，否则 'liked' 会被 ':id' 吞掉
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('count') count?: string) {
    const post = await this.postsService.findOnePublic(
      Number(id),
      count !== '0',
    );
    if (!post) throw new NotFoundException('帖子不存在或未发布');
    return post;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: number; role?: string },
  ) {
    return this.postsService.remove(Number(id), user);
  }
}
