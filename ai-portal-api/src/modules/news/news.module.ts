import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { News } from "../../entities/news.entity";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([News]), AuthModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
