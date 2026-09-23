import { ElMessage } from "element-plus";
import type { MessageType } from "element-plus";

/**
 * 全局消息提示（基于 ElMessage 封装，用法与模板一致）：
 * `message("登录成功", { type: "success" })`
 */
export function message(
  content: string | undefined | null,
  options?: {
    type?: MessageType;
    duration?: number;
    showClose?: boolean;
    grouping?: boolean;
  }
): void {
  if (!content) return;
  const { type = "info", duration = 3000, showClose = false, grouping = true } =
    options ?? {};
  ElMessage({
    message: content,
    type,
    duration,
    showClose,
    grouping
  });
}
