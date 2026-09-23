/**
 * 轻量 Markdown 纯文本提取：用于列表页摘要等只读场景。
 * 去除代码块、标记符号与图片/链接语法，保留可读文字，
 * 不做完整 AST 解析（详情页渲染交给 md-editor-rt 的 MdPreview）。
 */
export function stripMarkdown(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/```[\s\S]*?```/g, "") // 围栏代码块
    .replace(/`([^`]*)`/g, "$1") // 行内代码
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接
    .replace(/^\s{0,3}>\s?/gm, "") // 引用
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // 标题
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "") // 列表
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // 加粗
    .replace(/(\*|_)(.*?)\1/g, "$2") // 斜体
    .replace(/~~(.*?)~~/g, "$1") // 删除线
    .replace(/\n{2,}/g, "\n")
    .trim();
}
