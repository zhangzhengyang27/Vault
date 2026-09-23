/**
 * Element Plus 图标集补齐：welcome 页引用了 News 图标，
 * 当前版本 @element-plus/icons-vue 未导出（运行时由 vite.config.ts
 * 的 icons-news-compat 插件以 Document 图标补位）。
 *
 * 注意：export {} 使本文件成为模块文件，
 * declare module 才是「模块增强」而非「声明新模块」。
 */
export {};

declare module "@element-plus/icons-vue" {
  /** 以 Document 补位导出（类型放宽为 any 以匹配任意图标组件的使用处） */
  export const News: any;
}
