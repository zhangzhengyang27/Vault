import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Prompt } from "../../entities/prompt.entity";
import { Category } from "../../entities/category.entity";
import { AuthModule } from "../../auth/auth.module";
import { PromptsController } from "./prompts.controller";
import { PromptsService } from "./prompts.service";

@Module({
  imports: [TypeOrmModule.forFeature([Prompt, Category]), AuthModule],
  controllers: [PromptsController],
  providers: [PromptsService],
})
export class PromptsModule {}
