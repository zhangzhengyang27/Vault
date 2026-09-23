import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { OperLogInterceptor } from '../../logs/oper-log.interceptor';

@Controller('reports')
@UseInterceptors(OperLogInterceptor)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** 登录用户提交举报 */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: { username: string },
  ) {
    return this.reportsService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  resolve(
    @Param('id') id: string,
    @Body() body: { status: 'open' | 'resolved' },
  ) {
    return this.reportsService.resolve(Number(id), body.status);
  }
}
