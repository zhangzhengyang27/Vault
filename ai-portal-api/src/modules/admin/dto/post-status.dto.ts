import { IsIn } from 'class-validator';

export class PostStatusDto {
  /** published 展示 / hidden 下架 */
  @IsIn(['published', 'hidden'])
  status: 'published' | 'hidden';
}
