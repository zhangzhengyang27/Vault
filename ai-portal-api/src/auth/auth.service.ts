import {
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OnlineUserService } from './online-user.service';

/** refresh token 有效期（毫秒），与签发 expiresIn '30d' 一致 */
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly onlineUsers: OnlineUserService,
  ) {}

  private sign(user: User) {
    return this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  /**
   * 签发 refresh token：携带 typ=refresh 声明（JwtAuthGuard 会拒绝用
   * refresh token 冒充 access token），30 天有效。管理后台使用 Bearer
   * 双 token 方案；前台门户仍走 HttpOnly cookie（内含 access token）。
   * 签发后即刻入库（SHA-256 哈希），支持撤销与轮换。
   */
  private async signRefresh(user: User) {
    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        typ: 'refresh',
        // jti 保证同一秒内多次签发 token 仍唯一（iat 只有秒级精度，
        // 否则相同载荷会产出相同 token，撞 refresh_tokens.token_hash 唯一约束）
        jti: randomUUID(),
      },
      { expiresIn: '30d' },
    );
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      }),
    );
    return token;
  }

  /** 只存哈希：数据库泄露无法还原 token */
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /** access token 有效期（秒）：与 JWT 全局 expiresIn '7d' / cookie maxAge 一致 */
  readonly accessExpiresIn = 7 * 24 * 60 * 60;

  private sanitize(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...rest } = user;
    void passwordHash; // 显式忽略，避免未使用告警
    return rest;
  }

  /* ------------------- 账号维度登录防爆破 ------------------- */
  // IP 维度限流由全局 Throttler 承担；这里按 username 统计失败次数，
  // 防止攻击者从多个 IP 对单一账号撞库。内存实现，单实例部署足够。

  private static readonly LOGIN_MAX_FAILURES = 10;
  private static readonly LOGIN_WINDOW_MS = 15 * 60 * 1000;
  private loginFailures = new Map<string, number[]>();

  private assertLoginAllowed(username: string) {
    const key = username.toLowerCase();
    const now = Date.now();
    const recent = (this.loginFailures.get(key) ?? []).filter(
      (t) => now - t < AuthService.LOGIN_WINDOW_MS,
    );
    if (recent.length >= AuthService.LOGIN_MAX_FAILURES) {
      throw new HttpException(
        '登录失败次数过多，该账号已被临时锁定，请 15 分钟后再试',
        429,
      );
    }
    this.loginFailures.set(key, recent);
  }

  private recordLoginFailure(username: string) {
    const key = username.toLowerCase();
    const recent = (this.loginFailures.get(key) ?? []).filter(
      (t) => Date.now() - t < AuthService.LOGIN_WINDOW_MS,
    );
    recent.push(Date.now());
    this.loginFailures.set(key, recent);
  }

  private clearLoginFailures(username: string) {
    this.loginFailures.delete(username.toLowerCase());
  }

  async register(dto: RegisterDto) {
    const exists = await this.users.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save(
      this.users.create({
        username: dto.username,
        email: dto.email ?? null,
        passwordHash,
      }),
    );

    // token 供控制器写 Set-Cookie；响应体由控制器剥离，不回传前端
    return { token: await this.sign(user), user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    this.assertLoginAllowed(dto.username);

    const user = await this.users.findOne({
      where: { username: dto.username },
    });
    if (!user || !user.passwordHash) {
      this.recordLoginFailure(dto.username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.recordLoginFailure(dto.username);
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.status === 'banned') {
      throw new UnauthorizedException('账号已被封禁，请联系管理员');
    }

    // 重新登录解除此前的强制下线标记
    this.onlineUsers.clearRevoked(user.id);
    this.clearLoginFailures(user.username);

    return {
      token: await this.sign(user),
      refreshToken: await this.signRefresh(user),
      user: this.sanitize(user),
    };
  }

  /**
   * 用 refresh token 换发新的 access token，并轮换 refresh token。
   * 校验链：签名 + typ=refresh → 未被强退 → 数据库行存在且未撤销/过期
   * → 重用检测（已轮换 token 再次出现 = 疑似泄露，撤销该用户全部会话）。
   * 被封禁用户即使持有有效 refresh token 也无法续期。
   */
  async refresh(rawToken: string) {
    const payload = await this.verifyRefreshToken(rawToken);
    const userId = payload.sub;

    if (this.onlineUsers.isRevoked(userId)) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.status === 'banned') {
      throw new UnauthorizedException('账号不存在或已被封禁');
    }

    const row = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!row) {
      // 该功能上线前签发的旧 refresh token 无库记录，一律要求重新登录
      throw new UnauthorizedException('refresh token 已失效，请重新登录');
    }
    if (row.revokedAt) {
      // 已轮换/已撤销的 token 再次使用：视为泄露，撤销该用户全部会话
      await this.revokeAllForUser(userId);
      throw new UnauthorizedException('refresh token 已失效，请重新登录');
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('refresh token 已过期，请重新登录');
    }

    // 轮换：旧 token 作废，签发新 refresh token（前端需保存返回的 refresh_token）
    await this.refreshTokens.update(row.id, { revokedAt: new Date() });
    return {
      accessToken: await this.sign(user),
      refreshToken: await this.signRefresh(user),
    };
  }

  /** 撤销某用户全部 refresh token（改密码 / 疑似泄露 / 管理员强退） */
  async revokeAllForUser(userId: number) {
    await this.refreshTokens
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  /** 修改密码：校验原密码后更新哈希，并撤销该用户全部会话（refresh 入库 + access 强退） */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('账号不存在');
    }
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('原密码错误');
    }
    if (user.status === 'banned') {
      throw new UnauthorizedException('账号已被封禁，无法修改密码');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.save(user);
    // 被盗号场景下改密码必须踢掉既有会话：refresh 全部作废 + access 立即强退
    await this.revokeAllForUser(userId);
    this.onlineUsers.revoke(userId);
    return { success: true };
  }

  /** 更新个人资料：邮箱（唯一性校验）+ 展示资料（昵称/头像/简介） */
  async updateProfile(
    userId: number,
    profile: {
      email?: string | null;
      nickname?: string | null;
      bio?: string | null;
      avatar?: string | null;
    },
  ) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('账号不存在');
    }
    if (profile.email !== undefined) {
      const email = profile.email === '' ? null : (profile.email ?? null);
      if (email) {
        const exists = await this.users.findOne({ where: { email } });
        if (exists && exists.id !== userId) {
          throw new ConflictException('该邮箱已被其他账号使用');
        }
      }
      user.email = email;
    }
    // 展示资料：空串统一归一为 null（语义为「未填写」）
    if (profile.nickname !== undefined) {
      user.nickname = profile.nickname?.trim() || null;
    }
    if (profile.bio !== undefined) {
      user.bio = profile.bio?.trim() || null;
    }
    if (profile.avatar !== undefined) {
      user.avatar = profile.avatar?.trim() || null;
    }
    await this.users.save(user);
    return this.sanitize(user);
  }

  /** 登出：撤销对应的 refresh token（cookie 中的 access token 由控制器清除） */
  async logout(rawToken?: string) {
    if (!rawToken) return;
    const row = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (row && !row.revokedAt) {
      await this.refreshTokens.update(row.id, { revokedAt: new Date() });
    }
  }

  /** 校验 refresh token：签名 + typ 声明必须为 refresh（防 access token 冒用） */
  async verifyRefreshToken(token: string): Promise<{
    sub: number;
    username: string;
    role: string;
  }> {
    let payload: {
      sub: number;
      username: string;
      role: string;
      typ?: string;
    };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('refresh token 无效');
    }
    return payload;
  }

  async me(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.status === 'banned') {
      throw new UnauthorizedException('账号不存在或已被封禁');
    }
    // JWT 已由 HttpOnly cookie 携带，这里只返回用户信息（不再回传 token）
    return this.sanitize(user);
  }
}
