import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { join } from "path";
import { Reflector } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

/**
 * 确保 pg_trgm GIN 索引存在。
 * TypeORM synchronize 不认识 gin_trgm_ops 操作符类，会在启动时删除这类索引，
 * 因此需要在每次启动后显式重建。
 */
async function ensureGinTrgmIndexes(dataSource: DataSource): Promise<void> {
  const logger = new Logger("IndexBootstrap");
  const statements = [
    `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
    `CREATE INDEX IF NOT EXISTS idx_tools_name_trgm ON tools USING gin (name gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_tools_description_trgm ON tools USING gin (description gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_prompts_title_trgm ON prompts USING gin (title gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_prompts_description_trgm ON prompts USING gin (description gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_news_title_trgm ON news USING gin (title gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_news_summary_trgm ON news USING gin (summary gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING gin (title gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_summary_trgm ON articles USING gin (summary gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_repos_name_trgm ON repos USING gin (name gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_repos_description_trgm ON repos USING gin (description gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_mcps_name_trgm ON mcps USING gin (name gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_mcps_description_trgm ON mcps USING gin (description gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_title_trgm ON resources USING gin (title gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_description_trgm ON resources USING gin (description gin_trgm_ops)`,
  ];
  try {
    for (const sql of statements) {
      await dataSource.query(sql);
    }
    logger.log("pg_trgm GIN 索引已就绪");
  } catch (e) {
    logger.warn(
      `GIN 索引初始化失败: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api");

  // helmet v8 不再隐藏 Server 指纹，显式关闭
  app.disable("x-powered-by");

  // 安全响应头：nosniff/frameguard/HSTS 等默认开启。
  // CSP 关闭（API + uploads 场景由前端站点点控制）；uploads 资源允许跨站嵌入。
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // 反向代理部署时设置 TRUST_PROXY（跳数或 'true'），使限流/日志拿到真实客户端 IP；
  // 未设置时保持默认，防止客户端伪造 X-Forwarded-For 绕过限流。
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.set("trust proxy", Number.isNaN(hops) ? trustProxy : hops);
  }

  // CORS：配置白名单来源（本地开发 + 局域网访问，可通过环境变量覆盖）。
  // 浏览器扩展（MV3 popup）的 fetch 受 CORS 约束且未授予 host_permissions，
  // 默认放行 chrome-extension:// 来源读取公开数据；设 CORS_ALLOW_EXTENSION=false 关闭。
  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowExtension = process.env.CORS_ALLOW_EXTENSION !== "false";
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (allowExtension && origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  });

  // 解析 HttpOnly cookie（用于 JWT 认证）
  app.use(cookieParser());

  // 全局校验：白名单剔除多余字段，并自动做类型转换（query 数字等）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  // 全局异常过滤器：统一错误响应，避免泄露堆栈信息
  app.useGlobalFilters(new AllExceptionsFilter());
  // 全局序列化：配合实体上的 @Exclude 剔除敏感字段（如 passwordHash）
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });

  // 优雅停机：等待连接关闭
  app.enableShutdownHooks();

  // 开发默认 JWT_SECRET 告警（缺失时 auth 模块会直接启动失败）
  if (process.env.JWT_SECRET === "ai-portal-dev-secret") {
    new Logger("Security").warn(
      "当前使用开发默认 JWT_SECRET，仅限本地开发；部署前必须更换为强随机密钥",
    );
  }

  // 确保 GIN trgm 索引存在（synchronize 会删除这类索引）
  const dataSource = app.get(DataSource);
  await ensureGinTrgmIndexes(dataSource);

  // 绑定 0.0.0.0，使后端可被局域网内其他设备访问
  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}
void bootstrap();
