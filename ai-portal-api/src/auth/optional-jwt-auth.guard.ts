import { ExecutionContext, Injectable } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

/**
 * 可选认证守卫：有合法 token 时挂上 request.user，无 token/失效时匿名放行。
 * 复用 JwtAuthGuard 的完整校验逻辑，仅把「认证失败」从拒绝降级为匿名。
 */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // 匿名访问：request.user 保持 undefined
    }
    return true;
  }
}
