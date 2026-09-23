import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { CONTENT_STATUSES } from '../../admin/dto/admin-content.dto';

export class CreateArticleDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  summary: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  phase?: string;
}
