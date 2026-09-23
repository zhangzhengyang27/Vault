import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AdminUsersService } from "./admin-users.service";
import { AdminUserStatusDto, AdminUserRoleDto } from "./dto/admin-user.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";
import { OperLogInterceptor } from "../../logs/oper-log.interceptor";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@UseInterceptors(OperLogInterceptor)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  list(
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminUsersService.list({
      q,
      role,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @CurrentUser() me: { id: number },
    @Body() dto: AdminUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(Number(id), me.id, dto.status);
  }

  @Patch(":id/role")
  updateRole(
    @Param("id") id: string,
    @CurrentUser() me: { id: number },
    @Body() dto: AdminUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(Number(id), me.id, dto.role);
  }
}
