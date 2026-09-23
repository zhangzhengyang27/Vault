import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { CONTENT_STATUSES } from "../../admin/dto/admin-content.dto";
import { NEWS_CATEGORY_KEYS } from "../news-categories";

export class CreateNewsDto {
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
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(NEWS_CATEGORY_KEYS)
  category?: string;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  phase?: string;
}
