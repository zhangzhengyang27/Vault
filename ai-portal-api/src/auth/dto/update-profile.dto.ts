import { IsEmail, IsOptional, MaxLength } from "class-validator";

export class UpdateProfileDto {
  /** 传空字符串表示清空邮箱 */
  @IsOptional()
  @IsEmail({}, { message: "邮箱格式不正确" })
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @MaxLength(30, { message: "昵称最多 30 个字" })
  nickname?: string | null;

  @IsOptional()
  @MaxLength(200, { message: "简介最多 200 个字" })
  bio?: string | null;

  /** 头像图片 URL（P0 用外链，不做文件上传） */
  @IsOptional()
  @MaxLength(500, { message: "头像地址过长" })
  avatar?: string | null;
}
