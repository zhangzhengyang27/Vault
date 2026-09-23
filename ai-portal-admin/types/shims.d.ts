/**
 * 资源模块声明（vite-svg-loader 处理 `?component`；
 * 普通图片导入由 vite/client 提供类型）。
 */
declare module "*.svg?component" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

/** @iconify-json 离线图标集（icons.json 体量大，避免 TS 全量推断） */
declare module "@iconify-json/ep/icons.json" {
  const data: any;
  export default data;
}
declare module "@iconify-json/ri/icons.json" {
  const data: any;
  export default data;
}
