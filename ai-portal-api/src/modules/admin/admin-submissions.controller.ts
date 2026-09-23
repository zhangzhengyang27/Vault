import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SubmissionsService } from '../submissions/submissions.service';
import { ReviewSubmissionDto } from '../submissions/dto/review-submission.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { OperLogInterceptor } from '../../logs/oper-log.interceptor';

@Controller('admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@UseInterceptors(OperLogInterceptor)
export class AdminSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.submissionsService.findAll(status);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    return this.submissionsService.approve(Number(id), user.id);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.submissionsService.reject(Number(id), user.id, dto.reason);
  }
}
