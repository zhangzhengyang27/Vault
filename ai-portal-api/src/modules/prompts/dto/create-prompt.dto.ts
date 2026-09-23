import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PromptAttachmentDto {
  @IsString()
  type: string;

  @IsString()
  url: string;

  @IsString()
  name: string;
}

export class CreatePromptDto {
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  modelHint?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptAttachmentDto)
  attachments?: PromptAttachmentDto[] | null;
}
