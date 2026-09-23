import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** JwtAuthGuard 校验通过后挂在 request 上的用户信息 */
export interface RequestUser {
  id: number;
  username: string;
  role: string;
  status: string;
}

/**
 * 取当前登录用户。
 * 信息由 JwtAuthGuard 以数据库为准写入，读出即可信。
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    return req.user;
  },
);
