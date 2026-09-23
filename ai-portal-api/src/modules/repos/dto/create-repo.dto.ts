import { IsOptional, IsString } from "class-validator";

export class CreateRepoDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  stars?: string;

  @IsOptional()
  @IsString()
  lang?: string;

  @IsOptional()
  @IsString()
  phase?: string;
}
