import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tool } from "../../entities/tool.entity";
import { Category } from "../../entities/category.entity";
import { AuthModule } from "../../auth/auth.module";
import { ToolsController } from "./tools.controller";
import { ToolsService } from "./tools.service";

@Module({
  imports: [TypeOrmModule.forFeature([Tool, Category]), AuthModule],
  controllers: [ToolsController],
  providers: [ToolsService],
})
export class ToolsModule {}
