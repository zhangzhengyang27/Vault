import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateToolDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsNumber()
  categoryId?: number;
}
