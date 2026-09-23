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
import { ArticlesService } from "./articles.service";
import { CreateArticleDto } from "./dto/create-article.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";

@Controller("articles")
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("sort") sort?: string,
    @Query("knowledgeBase") knowledgeBase?: string,
  ) {
    return this.articlesService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      category,
      q,
      sort,
      knowledgeBase,
    });
  }

  @Get("knowledge-bases")
  getKnowledgeBases() {
    return this.articlesService.getKnowledgeBases();
  }

  @Get(":slug/related-tools")
  getRelatedTools(@Param("slug") slug: string) {
    return this.articlesService.getRelatedTools(slug);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.articlesService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  create(@Body() body: CreateArticleDto) {
    return this.articlesService.create(body);
  }

  @Patch(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  update(@Param("slug") slug: string, @Body() body: Partial<CreateArticleDto>) {
    return this.articlesService.update(slug, body);
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  remove(@Param("slug") slug: string) {
    return this.articlesService.remove(slug);
  }
}
