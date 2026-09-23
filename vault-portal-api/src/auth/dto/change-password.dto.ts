import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  // 旧密码只做非空校验（存量账号可能是 6 位），强度要求仅针对新密码
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
