import { IsBoolean, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsIn(['news', 'tool', 'prompt', 'github', 'knowledge'])
  sourceType?: 'news' | 'tool' | 'prompt' | 'github' | 'knowledge';

  @IsOptional()
  @IsIn(['minutely', 'hourly', 'daily', 'weekly'])
  crawlInterval?: 'minutely' | 'hourly' | 'daily' | 'weekly';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
