/** 全局环境变量类型 */
interface ImportMetaEnv {
  /** 打包公共路径 */
  readonly VITE_PUBLIC_PATH?: string;
  /** 路由历史模式：hash | h5 */
  readonly VITE_ROUTER_HISTORY?: string;
  readonly VITE_CDN?: string;
  readonly VITE_COMPRESSION?: string;
  /** API 网关前缀（默认 /api） */
  readonly VITE_GATEWAY?: string;
  /** 门户站点地址（内容管理跳转用） */
  readonly VITE_PORTAL_URL?: string;
  /** 是否隐藏首页 */
  readonly VITE_HIDE_HOME?: string;
  /** dev 端口 */
  readonly VITE_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
