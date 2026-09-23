import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// multer/busboy 对非 ASCII（如中文）文件名会按 latin1 解码成乱码，
// 这里做一次守卫式的 latin1 -> utf8 还原；若还原引入替换字符则保留原样。
function decodeOriginalName(name: string): string {
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    return decoded.includes("\uFFFD") ? name : decoded;
  } catch {
    return name;
  }
}

@Controller("uploads")
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("未上传文件");
    }
    return {
      url: `/uploads/${file.filename}`,
      name: decodeOriginalName(file.originalname),
      size: file.size,
    };
  }
}
