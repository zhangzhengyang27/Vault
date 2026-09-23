import { computed, ref, watch } from "vue";
import { getConfig } from "@/config";

/**
 * 主题切换（精简版：ElementPlus 暗色变量 + html.dark）。
 * 登录页用法：const { dataTheme, themeMode, dataThemeChange } = useDataThemeChange();
 */
export function useDataThemeChange() {
  const dataTheme = ref(false);
  const themeMode = ref<string>(getConfig().ThemeMode ?? "light");

  /**
   * 切换主题：
   * - mode 为 boolean 时来自 el-switch @change
   * - mode 为 "dark"/"light" 时为显式指定
   */
  function dataThemeChange(mode: boolean | string = themeMode.value) {
    const dark = typeof mode === "boolean" ? mode : mode === "dark";
    dataTheme.value = dark;
    themeMode.value = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
  }

  // 保持 html.dark 与 dataTheme 同步
  watch(dataTheme, value => {
    if (value !== document.documentElement.classList.contains("dark")) {
      dataThemeChange(value);
    }
  });

  const epThemeColor = computed(() => getConfig().EpThemeColor ?? "#409EFF");

  return {
    dataTheme,
    themeMode,
    epThemeColor,
    dataThemeChange
  };
}
