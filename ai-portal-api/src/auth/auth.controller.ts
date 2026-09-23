import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { LoginLogService } from "../logs/login-log.service";

/** 通过 HttpOnly + SameSite cookie 下发 JWT，降低 XSS 窃取 token 的风险 */
function setAuthCookie(res: Response, token: string) {
  res.cookie("ai_portal_token", token, {
    httpOnly: true,
    sameSite: "lax",
    // 生产或显式设置 COOKIE_SECURE=true 时仅经 HTTPS 传输，
    // 避免 HTTPS 部署漏配 NODE_ENV 时 cookie 走明文
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.COOKIE_SECURE === "true",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天，与 JWT expiresIn 一致
    path: "/",
  });
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginLogs: LoginLogService,
  ) {}

  // 登录/注册限流：每分钟最多 10 次，防止暴力破解
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("register")
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);
    setAuthCookie(res, result.token);
    // 响应体只含用户信息：JWT 仅经 HttpOnly cookie 传递，防止脚本窃取
    return { user: result.user };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? null;
    const userAgent = req.headers["user-agent"];
    try {
      const result = await this.authService.login(body);
      // 成功与失败都落库，供安全审计（登录日志）
      await this.loginLogs.record({
        userId: result.user.id,
        username: body.username,
        success: true,
        ip,
        userAgent,
      });
      setAuthCookie(res, result.token);
      // 双通道下发：cookie 供前台门户（Next.js 同源代理）使用；
      // 响应体返回 Bearer 双 token 供独立管理后台（跨端口/跨域部署）使用
      return {
        user: result.user,
        access_token: result.token,
        refresh_token: result.refreshToken,
        expires_in: this.authService.accessExpiresIn,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "登录失败";
      await this.loginLogs.record({
        userId: null,
        username: body.username,
        success: false,
        message,
        ip,
        userAgent,
      });
      throw e;
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("refresh")
  async refresh(@Body() body: RefreshTokenDto) {
    // 校验在服务层做：verify typ=refresh 声明 → 回查数据库（撤销/过期/重用检测）
    // → 轮换（旧 refresh token 作废，签发新 token）
    const result = await this.authService.refresh(body.refreshToken);
    return {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: this.authService.accessExpiresIn,
    };
  }

  /** 登出：清除 cookie；携带 refresh token 时一并撤销（防继续换发） */
  @Post("logout")
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    res.clearCookie("ai_portal_token", { path: "/" });
    await this.authService.logout(body?.refreshToken);
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: number }) {
    return this.authService.me(user.id);
  }

  /** 账户设置：修改密码（校验原密码） */
  @Put("password")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: { id: number },
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      body.oldPassword,
      body.newPassword,
    );
  }

  /** 账户设置：更新个人资料（目前仅邮箱） */
  @Put("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: { id: number },
    @Body() body: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, body);
  }
}
