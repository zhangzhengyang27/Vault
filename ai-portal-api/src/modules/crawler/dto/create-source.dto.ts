import { IsBoolean, IsIn, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateSourceDto {
  @IsString()
  name: string;

  @IsUrl()
  url: string;

  @IsIn(["news", "tool", "prompt", "github", "knowledge"])
  sourceType: "news" | "tool" | "prompt" | "github" | "knowledge";

  @IsIn(["minutely", "hourly", "daily", "weekly"])
  @IsOptional()
  crawlInterval?: "minutely" | "hourly" | "daily" | "weekly";

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
