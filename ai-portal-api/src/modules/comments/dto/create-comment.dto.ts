import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** 一级嵌套回复：指向顶级评论 id */
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;
}
