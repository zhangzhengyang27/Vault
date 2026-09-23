import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { OnlineUserService } from '../../auth/online-user.service';
import { AuthService } from '../../auth/auth.service';
import { LoginLogService } from '../../logs/login-log.service';
import { OperLogService } from '../../logs/oper-log.service';
import { OperLogInterceptor } from '../../logs/oper-log.interceptor';

/**
 * 系统监控：登录日志 / 操作日志 / 在线用户。
 * 查询与清理仅管理员可用；清空/删除/强退本身也会进操作日志（审计闭环）。
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(OperLogInterceptor)
@Roles('admin')
@Controller('admin/logs')
export class AdminLogsController {
  constructor(
    private readonly loginLogs: LoginLogService,
    private readonly operLogs: OperLogService,
    private readonly onlineUsers: OnlineUserService,
    private readonly authService: AuthService,
  ) {}

  // ---------- 登录日志 ----------

  @Get('login-logs')
  async listLoginLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('username') username?: string,
    @Query('success') success?: string,
  ) {
    return this.loginLogs.list({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      username: username || undefined,
      success:
        success === 'true' ? true : success === 'false' ? false : undefined,
    });
  }

  @Delete('login-logs/:id')
  async removeLoginLog(@Param('id', ParseIntPipe) id: number) {
    await this.loginLogs.remove(id);
    return { success: true };
  }

  @Delete('login-logs')
  async clearLoginLogs() {
    await this.loginLogs.clear();
    return { success: true };
  }

  // ---------- 操作日志 ----------

  @Get('oper-logs')
  async listOperLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('username') username?: string,
  ) {
    return this.operLogs.list({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      username: username || undefined,
    });
  }

  @Get('oper-logs/:id')
  async operLogDetail(@Param('id', ParseIntPipe) id: number) {
    return this.operLogs.detail(id);
  }

  @Delete('oper-logs/:id')
  async removeOperLog(@Param('id', ParseIntPipe) id: number) {
    await this.operLogs.remove(id);
    return { success: true };
  }

  @Delete('oper-logs')
  async clearOperLogs() {
    await this.operLogs.clear();
    return { success: true };
  }

  // ---------- 在线用户 ----------

  @Get('online-users')
  online() {
    return this.onlineUsers.list();
  }

  /** 强制下线：access 立即 401，refresh token 全部作废（重启后依然生效），重新登录可恢复 */
  @Delete('online-users/:userId')
  async forceLogout(@Param('userId', ParseIntPipe) userId: number) {
    this.onlineUsers.revoke(userId);
    await this.authService.revokeAllForUser(userId);
    return { success: true };
  }
}
