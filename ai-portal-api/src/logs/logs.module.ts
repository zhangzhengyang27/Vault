import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginLog } from '../entities/login-log.entity';
import { OperLog } from '../entities/oper-log.entity';
import { LoginLogService } from './login-log.service';
import { OperLogService } from './oper-log.service';

/**
 * 全局日志模块：登录日志记录（auth 使用）+ 操作日志拦截器依赖（各管理控制器使用）。
 * 全局导出避免在每个业务模块重复 import。
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LoginLog, OperLog])],
  providers: [LoginLogService, OperLogService],
  exports: [LoginLogService, OperLogService, TypeOrmModule],
})
export class LogsModule {}
