import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateMcpDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsString()
  installMethod?: string;

  @IsOptional()
  @IsString()
  installTarget?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
