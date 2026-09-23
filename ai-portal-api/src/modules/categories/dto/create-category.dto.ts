import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  parentId?: number | null;
}
