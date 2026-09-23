import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  stats() {
    return this.adminService.stats();
  }

  @Get('trend')
  trend(@Query('days') days?: string) {
    return this.adminService.trend(days ? Number(days) : 7);
  }
}
