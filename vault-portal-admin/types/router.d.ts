/**
 * 全局路由类型（模板约定：router/modules 下的路由文件直接
 * `satisfies RouteConfigsTable` 使用，无需 import，故声明为全局类型）。
 */
declare interface RouteMetaConfig {
  /** 菜单标题（同时用于 document.title 与面包屑） */
  title?: string;
  /** 菜单图标：字符串（iconify 名，如 "ep:user"）或组件 */
  icon?: unknown;
  /** 菜单排序（仅一级路由生效，升序） */
  rank?: number;
  /** 页面级别权限 */
  roles?: Array<string>;
  /** 是否在侧边栏中显示 */
  showLink?: boolean;
  /** 是否缓存页面 */
  keepAlive?: boolean;
  /** 是否为后端/动态下发路由 */
  backstage?: boolean;
  /** iframe 嵌入地址 */
  frameSrc?: string;
  /** 外链地址 */
  isLink?: boolean;
  /** 额外图标 */
  extraIcon?: unknown;
}

declare interface RouteConfigsTable {
  path: string;
  name?: string;
  component?: unknown;
  redirect?: string;
  props?: unknown;
  meta?: RouteMetaConfig;
  children?: Array<RouteConfigsTable>;
  /** 由 buildHierarchyTree 填充 */
  parentId?: number;
  id?: number;
}

/**
 * 路由守卫中的 to 类型。
 * vue-router 的 RouteLocationNormalizedLoaded 是泛型别名（接口无法继承），
 * 且 RouteMeta 仅索引签名（meta.title 推断为 unknown），
 * 故用交叉类型收紧 matched/meta 的字段类型。
 */
declare type ToRouteType = Omit<
  import("vue-router").RouteLocationNormalizedLoaded,
  "matched"
> & {
  /** 收紧 matched 项的 meta（路由守卫里会读取/赋值 title、loaded） */
  matched: Array<
    import("vue-router").RouteLocationMatched & {
      meta: import("vue-router").RouteMeta & {
        title?: string;
        loaded?: boolean;
      };
    }
  >;
  meta: import("vue-router").RouteMeta & { loaded?: boolean };
};
