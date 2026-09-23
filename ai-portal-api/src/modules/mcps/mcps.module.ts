import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Mcp } from '../../entities/mcp.entity';
import { McpsController } from './mcps.controller';
import { McpsService } from './mcps.service';
import { McpRegistrySyncService } from './mcp-registry-sync.service';
import { McpToolsService } from './mcp-tools.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mcp]), ScheduleModule, AuthModule],
  controllers: [McpsController],
  providers: [McpsService, McpRegistrySyncService, McpToolsService],
  exports: [McpsService, McpRegistrySyncService, McpToolsService],
})
export class McpsModule {}
