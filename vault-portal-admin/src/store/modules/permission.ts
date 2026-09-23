import { defineStore } from "pinia";
import { store } from "../index";

/**
 * 权限/菜单状态：
 * wholeMenus 为侧边栏渲染的完整菜单树（保持原始层级、已过滤隐藏项）。
 */
export const usePermissionStore = defineStore("pure-permission", {
  state: () => ({
    /** 整个菜单（保持原始层级） */
    wholeMenus: [] as Array<any>,
    /** 缓存页面 keep-alive 列表 */
    cachingPageList: [] as Array<string>
  }),
  actions: {
    /** 写入菜单树（由 router/utils 在 initRouter 时调用，传入已排序数组） */
    handleWholeMenus(routes: Array<any> = []) {
      this.wholeMenus = filterShowMenus(routes);
    },
    /** 清空缓存页面 */
    clearAllCachePage() {
      this.cachingPageList = [];
      this.wholeMenus = [];
    },
    /** 添加缓存页面 */
    cacheOperate(mode: "add" | "delete", name?: string) {
      if (!name) return;
      if (mode === "add") {
        if (!this.cachingPageList.includes(name)) this.cachingPageList.push(name);
      } else {
        this.cachingPageList = this.cachingPageList.filter(v => v !== name);
      }
    }
  }
});

/** 递归过滤 showLink 为 false 的菜单项 */
function filterShowMenus(routes: Array<any>): Array<any> {
  return routes
    .filter(v => v?.meta?.showLink !== false)
    .map(v => {
      const item = { ...v };
      if (Array.isArray(v.children) && v.children.length) {
        item.children = filterShowMenus(v.children);
      }
      return item;
    });
}

export function usePermissionStoreHook() {
  return usePermissionStore(store);
}
