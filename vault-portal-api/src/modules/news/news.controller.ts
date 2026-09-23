import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NewsService } from "./news.service";
import { CreateNewsDto } from "./dto/create-news.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";

@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") q?: string,
    @Query("sort") sort?: string,
    @Query("category") category?: string,
  ) {
    return this.newsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      q,
      sort,
      category,
    });
  }

  /** 各分类已发布计数（列表页 chips 用）；必须声明在 @Get(':slug') 之前 */
  @Get("categories")
  categories() {
    return this.newsService.countByCategory();
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.newsService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  create(@Body() body: CreateNewsDto) {
    return this.newsService.create(body);
  }

  @Patch(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  update(@Param("slug") slug: string, @Body() body: Partial<CreateNewsDto>) {
    return this.newsService.update(slug, body);
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  remove(@Param("slug") slug: string) {
    return this.newsService.remove(slug);
  }
}
