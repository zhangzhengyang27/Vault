import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

/** 内容状态白名单：published 前台可见，其余（draft/pending/archived/rejected）前台隐藏 */
export const CONTENT_STATUSES = [
  "published",
  "draft",
  "pending",
  "archived",
  "rejected",
] as const;

/**
 * 后台内容创建/编辑的统一 DTO。
 * 覆盖 tools/prompts/articles/news 全部可写字段；
 * 各类型实际写入哪些字段由服务端的 TYPE_CONFIG 白名单控制。
 */
export class AdminContentDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsNumber() rating?: number;
  @IsOptional() @IsBoolean() isFree?: boolean;
  @IsOptional() @IsBoolean() requiresLogin?: boolean;
  @IsOptional() @IsNumber() categoryId?: number | null;
  @IsOptional() @IsIn(CONTENT_STATUSES) status?: string;
  @IsOptional() @IsString() phase?: string;
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() modelHint?: string;
  @IsOptional() @IsString() optimizedContent?: string | null;
  @IsOptional() @IsString() knowledgeBase?: string | null;
  @IsOptional() @IsString() time?: string;
  @IsOptional() @IsString() endpoint?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() installMethod?: string;
  @IsOptional() @IsString() installTarget?: string;
  @IsOptional() @IsString() stars?: string;
  @IsOptional() @IsString() lang?: string;
  /** mcps：mcp = MCP 服务器；skill = Agent Skill；resources：资源类型（自由文本） */
  @IsOptional() @IsString() type?: string;

  /**
   * 索引签名：服务端需按 TYPE_CONFIG 的白名单以「列名」动态读写字段，
   * 这里开放索引视图以便按名访问。运行时仍由 class-validator 的
   * `whitelist` 剔除未声明字段，不会额外写入数据。
   */
  [key: string]: unknown;
}
