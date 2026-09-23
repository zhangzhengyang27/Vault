/**
 * 列表接口全量拉取：按 page/limit 循环翻页直到取完。
 * 解决「单次 limit=100 静默截断」问题——数据量超过单页上限时，
 * 第 101 条起此前永远不可见且无任何提示。
 *
 * cap 为安全上限（防极端情况下无限循环），当前站内各列表数据量
 * 均远低于该值；超过 cap 时会截断，需改用真正的服务端分页 UI。
 */
export async function fetchAllList<T = unknown>(
  basePath: string,
  opts: { cap?: number; signal?: AbortSignal } = {},
): Promise<T[]> {
  const cap = opts.cap ?? 1000;
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const sep = basePath.includes("?") ? "&" : "?";
    const res = await fetch(`${basePath}${sep}page=${page}&limit=100`, {
      signal: opts.signal,
    });
    if (!res.ok) break;
    const data = await res.json();
    const arr: T[] = Array.isArray(data) ? data : data.items ?? [];
    items.push(...arr);
    totalPages = Number(data?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages && items.length < cap);
  return items;
}
