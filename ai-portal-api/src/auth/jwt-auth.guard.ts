import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../entities/user.entity';
import { OnlineUserService } from './online-user.service';

interface JwtPayload {
  sub: number;
  username: string;
  role?: string;
  /** refresh token 类型标记：refresh token 不得用于普通鉴权 */
  typ?: string;
}

interface AuthedRequest extends Request {
  user?: { id: number; username: string; role: string; status: string };
}

/**
 * JWT 认证守卫：
 * 1. 校验 token（Authorization header 或 HttpOnly cookie）
 * 2. 从数据库加载用户，以数据库为准（而非 token 内声明），保证：
 *    - 被封禁（status=banned）的用户立即失效，即使持有未过期 token
 *    - 被降级/提升的管理员角色立即生效，不存在 7 天 token 窗口
 * 3. 顺带维护在线用户注册表（最近活跃），并拒绝被强制下线的用户
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly onlineUsers: OnlineUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    // 优先取 Authorization header，其次取 HttpOnly cookie
    const auth = request.headers.authorization;
    const cookies: Record<string, string> | undefined = (
      request as Request & { cookies?: Record<string, string> }
    ).cookies;
    let token: string | undefined;
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.slice(7);
    } else if (cookies?.ai_portal_token) {
      token = cookies.ai_portal_token;
    }

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // refresh token 只能用于 /auth/refresh 换发，不能冒充 access token 访问接口
    if (payload.typ === 'refresh') {
      throw new UnauthorizedException();
    }

    // 以数据库为准加载用户：被封禁或已删除的用户立即拒绝
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.status === 'banned') {
      throw new UnauthorizedException('账号不存在或已被封禁');
    }

    // 被管理员强制下线的用户立即拒绝（重新登录可解除）
    if (
      !this.onlineUsers.touch(
        { id: user.id, username: user.username, role: user.role },
        request,
      )
    ) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }

    request.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
    };
    return true;
  }
}
