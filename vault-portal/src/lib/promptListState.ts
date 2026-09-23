// 列表页状态缓存：用于从详情页返回时还原筛选/分页/数据与滚动位置。
// 仅允许在客户端使用模块级单例，避免服务端 SSR 期间不同请求间串扰。
const IS_CLIENT = typeof window !== "undefined";

export interface CachedPrompt {
  slug: string;
  title: string;
  description: string;
  category?: { name: string } | null;
  author: string;
  uses: number;
  phase: string;
  source?: string;
  attachments?: { type: string; url: string; name: string }[] | null;
}

export interface ListSnapshot {
  prompts: CachedPrompt[] | null;
  cat: string;
  contentCat: string;
  /** 提示词类型筛选（暂只从缓存读取，未接入切换 UI） */
  typeFilter: string;
  sort: string;
  page: number;
  totalPages: number;
  scrollY: number;
}

function defaultSnapshot(): ListSnapshot {
  return {
    prompts: null,
    typeFilter: "全部",
    cat: "全部",
    contentCat: "全部",
    sort: "default",
    page: 1,
    totalPages: 1,
    scrollY: 0,
  };
}

const store = new Map<string, ListSnapshot>();

// key 形如 "general:none" / "precise:text" / "precise:none"
export function getListCache(key: string): ListSnapshot | null {
  if (!IS_CLIENT) return null;
  return store.get(key) ?? null;
}

export function setListCache(key: string, patch: Partial<ListSnapshot>): void {
  if (!IS_CLIENT) return;
  const prev = store.get(key);
  store.set(key, { ...(prev ?? defaultSnapshot()), ...patch });
}

export function clearListCache(key?: string): void {
  if (!IS_CLIENT) return;
  if (key) store.delete(key);
  else store.clear();
}
