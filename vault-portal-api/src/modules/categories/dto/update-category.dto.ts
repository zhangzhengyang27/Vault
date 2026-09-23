import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
