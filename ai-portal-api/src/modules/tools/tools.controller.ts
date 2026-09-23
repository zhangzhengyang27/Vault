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
import { ToolsService } from "./tools.service";
import { CreateToolDto } from "./dto/create-tool.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";

@Controller("tools")
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("tag") tag?: string,
    @Query("q") q?: string,
    @Query("free") free?: string,
    @Query("sort") sort?: string,
  ) {
    return this.toolsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      category,
      tag,
      q,
      free: free === "1" || free === "true",
      sort,
    });
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.toolsService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  create(@Body() body: CreateToolDto) {
    return this.toolsService.create(body);
  }

  @Patch(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  update(@Param("slug") slug: string, @Body() body: Partial<CreateToolDto>) {
    return this.toolsService.update(slug, body);
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  remove(@Param("slug") slug: string) {
    return this.toolsService.remove(slug);
  }
}
