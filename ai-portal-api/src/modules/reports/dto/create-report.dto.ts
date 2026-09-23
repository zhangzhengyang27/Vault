import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 允许被举报的内容类型（与评论目标白名单一致） */
export const REPORT_TARGETS = [
  'tool',
  'prompt',
  'article',
  'news',
  'repo',
  'resource',
  'mcp',
  'post',
] as const;

export class CreateReportDto {
  @IsIn(REPORT_TARGETS)
  targetType: string;

  @IsNumber()
  targetId: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetTitle?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason: string;
}
