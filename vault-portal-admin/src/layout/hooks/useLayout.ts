import { initStorage } from "@/utils/responsive";

/**
 * 布局初始化（登录页挂载时调用）：
 * - initStorage：播种 responsive-storage 默认值
 * - layout / device：与模板一致的响应式读取（本后台固定 vertical + desktop）
 */
export function useLayout() {
  return {
    initStorage,
    layout: "vertical",
    device: "desktop"
  };
}
