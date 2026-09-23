import type { App } from "vue";

/** 平台配置（public/platform-config.json） */
export interface PlatformConfig {
  Version: string;
  Title: string;
  FixedHeader: boolean;
  HiddenSideBar: boolean;
  MultiTagsCache: boolean;
  KeepAlive: boolean;
  Layout: "vertical" | "horizontal" | "mix";
  Theme: string;
  DarkMode: boolean;
  ThemeMode: "light" | "dark" | "system";
  Grey: boolean;
  Weak: boolean;
  HideTabs: boolean;
  HideFooter: boolean;
  Stretch: boolean;
  SidebarStatus: boolean;
  EpThemeColor: string;
  ShowLogo: boolean;
  MenuActiveBar: boolean;
  Watermark: boolean;
  TagsStyle: string;
  MenuArrowIconNoTransition: boolean;
  CachingAsyncRoutes: boolean;
  TooltipEffect: string;
  ResponsiveStorageNameSpace: string;
  MenuSearchHistory: number;
  MapConfigure: {
    amapKey: string;
    options: Record<string, unknown>;
  };
}

/** 与 public/platform-config.json 保持一致的兜底默认值 */
const defaultConfig: PlatformConfig = {
  Version: "7.0.0",
  Title: "后台管理系统",
  FixedHeader: true,
  HiddenSideBar: false,
  MultiTagsCache: false,
  KeepAlive: true,
  Layout: "vertical",
  Theme: "light",
  DarkMode: false,
  ThemeMode: "light",
  Grey: false,
  Weak: false,
  HideTabs: false,
  HideFooter: false,
  Stretch: false,
  SidebarStatus: true,
  EpThemeColor: "#409EFF",
  ShowLogo: true,
  MenuActiveBar: true,
  Watermark: false,
  TagsStyle: "chrome",
  MenuArrowIconNoTransition: false,
  CachingAsyncRoutes: false,
  TooltipEffect: "light",
  ResponsiveStorageNameSpace: "responsive-",
  MenuSearchHistory: 6,
  MapConfigure: {
    amapKey: "",
    options: {
      resizeEnable: true,
      center: [113.6401, 34.72468],
      zoom: 12
    }
  }
};

let config: PlatformConfig = { ...defaultConfig };

/** 读取当前平台配置（启动后返回 platform-config.json 合并结果） */
export const getConfig = (): PlatformConfig => config;

/** responsive-storage 的命名空间前缀 */
export const responsiveStorageNameSpace = (): string =>
  config.ResponsiveStorageNameSpace || "responsive-";

/**
 * 启动时拉取 public/platform-config.json，与默认配置合并后返回。
 * 拉取失败时使用默认配置并给出告警，不阻断启动。
 */
export async function getPlatformConfig(_app?: App): Promise<PlatformConfig> {
  const base = import.meta.env.VITE_PUBLIC_PATH || "/";
  try {
    const res = await fetch(`${base.replace(/\/?$/, "/")}platform-config.json`, {
      headers: { "Cache-Control": "no-cache" }
    });
    if (res.ok) {
      const remote = (await res.json()) as Partial<PlatformConfig>;
      config = { ...defaultConfig, ...remote };
    } else {
      console.warn(
        `[config] platform-config.json 请求失败（${res.status}），使用默认配置`
      );
    }
  } catch (e) {
    console.warn("[config] platform-config.json 加载失败，使用默认配置", e);
  }
  return config;
}
