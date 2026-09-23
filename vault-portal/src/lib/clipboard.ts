/**
 * 复制文本到剪贴板。
 * 优先使用异步 Clipboard API（仅在安全上下文 / localhost 可用），
 * 在普通 HTTP 局域网 IP 等非安全上下文中回退到 execCommand('copy')。
 * 返回是否复制成功。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 继续走下方降级路径
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // 避免页面跳动 / 滚动
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
