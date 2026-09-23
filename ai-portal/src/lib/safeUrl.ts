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

/** 同源站内路径安全校验：只放行以单个 / 开头的相对路径（静态资源如 /demos/x.html）。
 *  拒绝 // 开头（协议相对外链）与一切带 scheme 的写法，外链仍走 safeExternalUrl。 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  // 单个 / 开头且第二个字符不是 /：站内绝对路径
  return /^\/(?!\/)[\w\-./?=&%#]*$/.test(url) ? url : null;
}
