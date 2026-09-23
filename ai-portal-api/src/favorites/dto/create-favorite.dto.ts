import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/** 可收藏的目标类型（与评论目标白名单一致，防止任意字符串脏数据） */
const FAVORITE_TARGETS = [
  "tool",
  "prompt",
  "article",
  "news",
  "repo",
  "resource",
  "mcp",
  "post",
];

export class CreateFavoriteDto {
  @IsIn(FAVORITE_TARGETS)
  targetType: string;

  @IsNumber()
  targetId: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
