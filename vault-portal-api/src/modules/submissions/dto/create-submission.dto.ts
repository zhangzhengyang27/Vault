import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateSubmissionDto {
  @IsIn(["tool", "prompt", "resource", "news", "mcp"])
  type: "tool" | "prompt" | "resource" | "news" | "mcp";

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contact?: string;
}
