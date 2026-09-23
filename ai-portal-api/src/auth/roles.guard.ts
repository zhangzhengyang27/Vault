import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import type { RequestUser } from "./current-user.decorator";

/**
 * 角色守卫：配合 @Roles('admin') 使用。
 * 必须放在 JwtAuthGuard 之后（@UseGuards(JwtAuthGuard, RolesGuard)）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{
      user?: RequestUser;
    }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException("无权限执行此操作");
    }
    return true;
  }
}
