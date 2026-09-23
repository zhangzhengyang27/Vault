import { BadRequestException, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { join } from "path";
import { randomBytes } from "crypto";
import { AuthModule } from "../auth/auth.module";
import { UploadsController } from "./uploads.controller";

/** 允许上传的 MIME 与对应扩展名白名单（扩展名由服务端从 MIME 反查生成） */
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!MIME_EXT[file.mimetype]) {
    cb(new BadRequestException("不支持的文件类型"), false);
    return;
  }
  cb(null, true);
}

@Module({
  imports: [
    AuthModule,
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), "uploads"),
        filename: (_req, file, cb) => {
          // 扩展名由 MIME 反查白名单生成，完全不采信用户原始文件名；
          // MIME 本身是客户端声明，残余风险由 helmet nosniff + 按扩展名
          // 的静态 Content-Type 兜底（不当作 HTML 执行）
          const ext = MIME_EXT[file.mimetype] ?? "";
          const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
          cb(null, name);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
      fileFilter,
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
