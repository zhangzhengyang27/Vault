import { IsIn } from 'class-validator';

export class AdminUserStatusDto {
  @IsIn(['active', 'banned'])
  status: string;
}

export class AdminUserRoleDto {
  @IsIn(['user', 'admin'])
  role: string;
}
