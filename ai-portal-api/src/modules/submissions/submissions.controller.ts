import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { SubmissionsService } from "./submissions.service";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";
import { OperLogInterceptor } from "../../logs/oper-log.interceptor";

@Controller("submissions")
@UseInterceptors(OperLogInterceptor)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /* ------------------------- 管理侧（必须在 :id 之前定义） ------------------------- */

  @Get("admin/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  findAll(@Query("status") status?: string) {
    return this.submissionsService.findAll(status);
  }

  /* ------------------------- 用户侧 ------------------------- */

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionsService.create(user.id, dto);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  findMy(@CurrentUser() user: { id: number }) {
    return this.submissionsService.findMy(user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id") id: string, @CurrentUser() user: { id: number }) {
    return this.submissionsService.findOneForUser(user.id, Number(id));
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  approve(@Param("id") id: string, @CurrentUser() user: { id: number }) {
    return this.submissionsService.approve(Number(id), user.id);
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  reject(
    @Param("id") id: string,
    @CurrentUser() user: { id: number },
    @Body() body: { reason?: string },
  ) {
    return this.submissionsService.reject(Number(id), user.id, body?.reason);
  }
}
