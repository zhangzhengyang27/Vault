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
import { ReposService } from "./repos.service";
import { CreateRepoDto } from "./dto/create-repo.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";

@Controller("repos")
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") q?: string,
    @Query("sort") sort?: string,
  ) {
    return this.reposService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      q,
      sort,
    });
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.reposService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  create(@Body() body: CreateRepoDto) {
    return this.reposService.create(body);
  }

  @Patch(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  update(@Param("slug") slug: string, @Body() body: Partial<CreateRepoDto>) {
    return this.reposService.update(slug, body);
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  remove(@Param("slug") slug: string) {
    return this.reposService.remove(slug);
  }
}
