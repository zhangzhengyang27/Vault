import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tool } from "../../entities/tool.entity";
import { Prompt } from "../../entities/prompt.entity";
import { Article } from "../../entities/article.entity";
import { News } from "../../entities/news.entity";
import { Repo } from "../../entities/repo.entity";
import { Mcp } from "../../entities/mcp.entity";
import { Resource } from "../../entities/resource.entity";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tool,
      Prompt,
      Article,
      News,
      Repo,
      Mcp,
      Resource,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
