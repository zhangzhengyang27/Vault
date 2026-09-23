import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ReviewBatchDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  /** 指定要处理的条目 id；不传则按 status 处理整批（受 limit 约束） */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(2000)
  ids?: number[];

  /** 待处理的当前状态，默认 pending */
  @IsOptional()
  @IsString()
  status?: string;

  /** 单次处理上限，默认 500 */
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
