import { Module } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "../entities/user.entity";
import { RefreshToken } from "../entities/refresh-token.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { OnlineUserService } from "./online-user.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        const isProd = config.get<string>("NODE_ENV") === "production";
        // 任何环境都不允许回退到硬编码默认值：可预测的密钥等于任何人可伪造 admin token
        if (!secret) {
          throw new Error(
            "必须设置 JWT_SECRET 环境变量（强随机密钥，如 openssl rand -hex 32 生成）",
          );
        }
        // 拒绝示例/文档值：照抄 .env.example 上线等于公开密钥
        const forbiddenSecrets = [
          "vault-portal-dev-secret",
          "change-me-to-a-strong-random-secret",
        ];
        if (forbiddenSecrets.includes(secret)) {
          if (isProd) {
            throw new Error(
              "生产环境禁止使用开发默认/示例 JWT_SECRET，请更换为强随机密钥",
            );
          }
          new Logger("Security").warn(
            "当前使用开发默认 JWT_SECRET，仅限本地开发；部署前必须更换为强随机密钥",
          );
        }
        return {
          secret,
          signOptions: { expiresIn: "7d" },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, OnlineUserService],
  // 导出 TypeOrmModule：让各模块在 @UseGuards(JwtAuthGuard) 实例化守卫时
  // 能解析到 UserRepository（守卫内部以数据库为准校验封禁/角色）
  exports: [
    TypeOrmModule,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    AuthService,
    OnlineUserService,
  ],
})
export class AuthModule {}
