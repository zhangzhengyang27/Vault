import type { App } from "vue";
import { getConfig, responsiveStorageNameSpace, type PlatformConfig } from "@/config";
import { storageLocal } from "@pureadmin/utils";

/**
 * responsive-storage 精简实现：
 * 首次启动把 platform-config.json 的关键项写入 localStorage
 * （命名空间默认 "responsive-"），供布局/主题 hook 读取与回写。
 */

export interface LayoutStorage {
  layout: string;
  theme: string;
  darkMode: boolean;
  sidebarStatus: boolean;
  epThemeColor: string;
  themeMode: string;
}

/** 布局配置的存储 key（带命名空间） */
export const layoutStorageKey = (): string =>
  `${responsiveStorageNameSpace()}layout`;

/** 读取布局配置（未初始化时返回平台配置默认值） */
export function getLayoutStorage(): LayoutStorage {
  const config = getConfig();
  const stored =
    storageLocal().getItem<Partial<LayoutStorage>>(layoutStorageKey()) ?? {};
  return {
    layout: stored.layout ?? config.Layout ?? "vertical",
    theme: stored.theme ?? config.Theme ?? "light",
    darkMode: stored.darkMode ?? config.DarkMode ?? false,
    sidebarStatus: stored.sidebarStatus ?? config.SidebarStatus ?? true,
    epThemeColor: stored.epThemeColor ?? config.EpThemeColor ?? "#409EFF",
    themeMode: stored.themeMode ?? config.ThemeMode ?? "light"
  };
}

/** 写回布局配置（局部合并） */
export function setLayoutStorage(patch: Partial<LayoutStorage>): void {
  const next = { ...getLayoutStorage(), ...patch };
  storageLocal().setItem(layoutStorageKey(), next);
}

/** 首次启动播种默认配置（已存在则不动） */
export function initStorage(config?: PlatformConfig): void {
  const cfg = config ?? getConfig();
  const key = `${cfg.ResponsiveStorageNameSpace || "responsive-"}layout`;
  if (storageLocal().getItem(key) == null) {
    storageLocal().setItem(key, {
      layout: cfg.Layout,
      theme: cfg.Theme,
      darkMode: cfg.DarkMode,
      sidebarStatus: cfg.SidebarStatus,
      epThemeColor: cfg.EpThemeColor,
      themeMode: cfg.ThemeMode
    });
  }
}

/** 模板约定的启动注入入口（在 router ready 后调用） */
export function injectResponsiveStorage(_app: App, config: PlatformConfig): void {
  initStorage(config);
}
