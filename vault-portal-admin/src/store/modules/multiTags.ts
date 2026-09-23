import { defineStore } from "pinia";
import { store } from "../index";
import { getConfig } from "@/config";

/** 标签页条目（path 唯一） */
export interface MultiTagsItem {
  path: string;
  name?: string;
  meta?: Record<string, any>;
  parameters?: Record<string, any>;
  query?: Record<string, any>;
}

type HandleTagsMode = "push" | "equal" | "delete" | "deleteRight" | "deleteLeft" | "deleteOther";

/** 多标签页状态（精简版：本后台未渲染页签，仅保持模板 API 兼容） */
export const useMultiTagsStore = defineStore("pure-multiTags", {
  state: () => ({
    multiTags: [] as Array<MultiTagsItem>,
    multiTagsCache: getConfig().MultiTagsCache ?? false
  }),
  getters: {
    /** 是否启用标签页缓存（路由守卫据此决定刷新时是否补标签） */
    getMultiTagsCache: state => state.multiTagsCache
  },
  actions: {
    handleTags(mode: HandleTagsMode, value?: any, _query?: Record<string, any>) {
      switch (mode) {
        case "equal":
          this.multiTags = Array.isArray(value) ? [...value] : [];
          break;
        case "push": {
          const tag = value as MultiTagsItem;
          if (tag?.path && !this.multiTags.some(t => t.path === tag.path)) {
            this.multiTags.push(tag);
          }
          break;
        }
        case "delete":
          this.multiTags = this.multiTags.filter(t => t.path !== value?.path);
          break;
        case "deleteOther":
          if (value?.path) this.multiTags = this.multiTags.filter(t => t.path === value.path);
          break;
        case "deleteRight": {
          const idx = this.multiTags.findIndex(t => t.path === value?.path);
          if (idx >= 0) this.multiTags = this.multiTags.slice(0, idx + 1);
          break;
        }
        case "deleteLeft": {
          const idx = this.multiTags.findIndex(t => t.path === value?.path);
          if (idx >= 0) this.multiTags = this.multiTags.slice(idx);
          break;
        }
      }
    },
    clear() {
      this.multiTags = [];
    }
  }
});

export function useMultiTagsStoreHook() {
  return useMultiTagsStore(store);
}
