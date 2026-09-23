import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { KnowledgeBaseMeta } from '../../entities/knowledge-base.entity';
import { Tool } from '../../entities/tool.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Category, KnowledgeBaseMeta, Tool]),
    AuthModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
