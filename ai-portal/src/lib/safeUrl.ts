/** 外链安全过滤：只放行 http(s) 链接，拦截 javascript:/data:/vbscript: 等注入面。
 *  不安全或无法解析时返回 null，调用方据此降级为纯文本展示。 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : null;
  } catch {
    return null;
  }
}
