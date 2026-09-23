import { defineStore } from "pinia";
import { store } from "../index";
import { getLayoutStorage, setLayoutStorage } from "@/utils/responsive";

/** 应用布局状态（侧边栏开合、设备类型） */
export const useAppStore = defineStore("pure-app", {
  state: () => ({
    sidebar: {
      opened: getLayoutStorage().sidebarStatus,
      withoutAnimation: false
    },
    device: "desktop" as "desktop" | "mobile"
  }),
  actions: {
    /** 折叠/展开侧边栏（并持久化） */
    toggleSideBar(withoutAnimation = false) {
      const opened = !this.sidebar.opened;
      this.sidebar.opened = opened;
      this.sidebar.withoutAnimation = withoutAnimation;
      setLayoutStorage({ sidebarStatus: opened });
    },
    setSidebar(opened: boolean) {
      this.sidebar.opened = opened;
      setLayoutStorage({ sidebarStatus: opened });
    },
    setDevice(device: "desktop" | "mobile") {
      this.device = device;
    }
  }
});

export function useAppStoreHook() {
  return useAppStore(store);
}
