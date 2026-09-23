import {
  Body,
  Query,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { OperLogInterceptor } from "../../logs/oper-log.interceptor";

@Controller("categories")
@UseInterceptors(OperLogInterceptor)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query("kind") kind?: string) {
    return this.categoriesService.findAll(kind);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body.slug, body.name, body.parentId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  update(@Param("id") id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(Number(id), body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(Number(id));
  }
}
