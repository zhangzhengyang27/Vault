import { open, type FileHandle } from 'fs/promises';
import { join, resolve, sep } from 'path';

export interface ImageDimensions {
  width: number;
  height: number;
}

// 仅需读取文件头（PNG 尺寸在固定偏移 16-23 字节；JPEG 在前若干字节内可找到 SOF）
const HEADER_BYTES = 128;

// 尺寸结果缓存：uploads 文件名为服务端生成的随机名（不可变），可安全按路径缓存，
// 避免列表接口每次请求对每个附件都执行 open/read/close 系统调用
const CACHE_LIMIT = 5000;
const dimensionCache = new Map<string, ImageDimensions | null>();

/**
 * 轻量图片尺寸读取器（零依赖）。
 * 仅流式读取文件头（最多 128 字节）解析 JPEG / PNG 宽高，
 * 避免将整个大图读入内存，用于 API 返回时附带宽高信息，
 * 让前端瀑布流布局能按真实比例预留空间、消除 CLS。
 */
export async function getImageDimensions(
  filePath: string,
): Promise<ImageDimensions | null> {
  if (dimensionCache.has(filePath)) {
    return dimensionCache.get(filePath)!;
  }

  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, 'r');
    const buf = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buf, 0, HEADER_BYTES, 0);
    const head = buf.subarray(0, bytesRead);

    const ext = filePath.toLowerCase();
    let result: ImageDimensions | null = null;
    if (ext.endsWith('.jpeg') || ext.endsWith('.jpg')) result = parseJpeg(head);
    else if (ext.endsWith('.png')) result = parsePng(head);
    else if (head[0] === 0xff && head[1] === 0xd8) result = parseJpeg(head);
    else if (head[0] === 0x89 && head[1] === 0x50) result = parsePng(head);

    if (dimensionCache.size >= CACHE_LIMIT) {
      // 简单防膨胀：清空重建（尺寸解析成本低，重新预热即可）
      dimensionCache.clear();
    }
    dimensionCache.set(filePath, result);
    return result;
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

// ── JPEG ──────────────────────────────────────────────
function parseJpeg(buf: Buffer): ImageDimensions | null {
  // 找 SOF0 (0xFFC0) 或 SOF2 (0xFFC2) 标记
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // 跳过 RST / 填充字节
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }
    // SOF0 / SOF2 / SOF1 / SOF3 / SOF9 / SOF11 / SOF13
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb
    ) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      if (w > 0 && h > 0) return { width: w, height: h };
      return null;
    }
    // 跳到下一个标记段
    const segLen = buf.readUInt16BE(i + 2);
    i += 2 + segLen;
  }
  return null;
}

// ── PNG ───────────────────────────────────────────────
function parsePng(buf: Buffer): ImageDimensions | null {
  // PNG 签名 8 字节 → IHDR 长度(4) + "IHDR"(4) → width(4) + height(4)
  if (buf.length < 24) return null;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w > 0 && h > 0) return { width: w, height: h };
  return null;
}

/**
 * 将相对 URL（如 /uploads/xxx.jpeg）映射为本地文件系统绝对路径。
 * 与 main.ts 中 useStaticAssets 的配置保持一致：
 *   app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' })
 */
export function urlToLocalPath(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const filename = url.slice('/uploads/'.length);
  // 归一化并校验，防止 ../ 等路径穿越读取 uploads 目录之外的文件
  const base = resolve(process.cwd(), 'uploads');
  const full = resolve(base, filename);
  if (full !== base && !full.startsWith(base + sep)) return null;
  return join(process.cwd(), 'uploads', filename);
}
