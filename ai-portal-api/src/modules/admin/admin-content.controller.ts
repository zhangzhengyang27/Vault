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
  UseInterceptors,
} from "@nestjs/common";
import { AdminContentService, ContentType } from "./admin-content.service";
import { AdminContentDto } from "./dto/admin-content.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { OperLogInterceptor } from "../../logs/oper-log.interceptor";

@Controller("admin/content")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@UseInterceptors(OperLogInterceptor)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  /** 管理端列表：全部状态，支持 status/q/page/limit */
  @Get(":type")
  list(@Param("type") type: string, @Query() query: Record<string, string>) {
    return this.adminContentService.list(type as ContentType, query);
  }

  @Get(":type/:id")
  findOne(@Param("type") type: string, @Param("id") id: string) {
    return this.adminContentService.findOne(type as ContentType, Number(id));
  }

  @Post(":type")
  create(@Param("type") type: string, @Body() body: AdminContentDto) {
    return this.adminContentService.create(type as ContentType, body);
  }

  @Patch(":type/:id")
  update(
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() body: AdminContentDto,
  ) {
    return this.adminContentService.update(
      type as ContentType,
      Number(id),
      body,
    );
  }

  @Delete(":type/:id")
  remove(@Param("type") type: string, @Param("id") id: string) {
    return this.adminContentService.remove(type as ContentType, Number(id));
  }
}
