/**
 * 生成唯一 slug：标题转小写、去符号、空格转连字符，追加短随机后缀避免冲突。
 */
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "item"}-${suffix}`;
}
