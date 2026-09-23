import { defineAsyncComponent, defineComponent, h, markRaw } from "vue";
import { cloneDeep, isAllEmpty } from "@pureadmin/utils";
import { type RouteRecordRaw, type RouterHistory, createWebHashHistory, createWebHistory } from "vue-router";
import { getAsyncRoutes } from "@/api/routes";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { buildHierarchyTree } from "@/utils/tree";
import { constantMenus, router } from "./index";
import ContentManager from "@/views/content/ContentManager.vue";
import { CONTENT_CONFIGS } from "@/views/content/configs";
import type { ContentType } from "@/api/admin";

/** Layout 外壳（目录级动态路由使用） */
const Layout = () => import("@/layout/index.vue");

/**
 * 路由工具集（vue-element-plus-admin 精简实现）：
 * - ascending / getTopMenu / initRouter / isOneOfArray / getHistoryMode
 * - findRouteByPath / handleAliveRoute / formatTwoStageRoutes / formatFlatteningRoutes
 * - addAsyncRoutes：菜单 component 字符串 → 真实组件（含映射表）
 */

/** 按菜单 meta.rank 升序排序 */
export function ascending(routes: Array<any>): Array<any> {
  return [...routes].sort(
    (a, b) => (a?.meta?.rank ?? 99) - (b?.meta?.rank ?? 99)
  );
}

/** 判断 a 中是否有任一角色存在于 b（页面级权限） */
/** 判断 a 中是否有任一角色存在于 b（页面级权限；入参来自路由 meta，放宽类型） */
export function isOneOfArray(a: any, b: any): boolean {
  return (
    Array.isArray(a) && Array.isArray(b) && a.some((key: any) => b.includes(key))
  );
}

/** 根据 VITE_ROUTER_HISTORY 配置返回路由历史实例（h5/hash） */
export function getHistoryMode(routerHistory?: string): RouterHistory {
  const mode = String(routerHistory ?? "h5").split(",")[0].trim().toLowerCase();
  if (mode === "hash") return createWebHashHistory();
  return createWebHistory();
}

/** 展开为扁平数组（依赖 buildHierarchyTree 填充的 parentId） */
export function formatFlatteningRoutes(routes: Array<any>): Array<any> {
  const result: Array<any> = [];
  routes.forEach((v: any) => {
    result.push(v);
    if (Array.isArray(v.children) && v.children.length) {
      result.push(...formatFlatteningRoutes(v.children));
    }
  });
  return result;
}

/** 三级及以上路由拍成二级（顶级 + 直接子级） */
export function formatTwoStageRoutes(routesFlattening: Array<any>): Array<any> {
  const parents = routesFlattening.filter(v => v.parentId == null);
  const children = routesFlattening.filter(v => v.parentId != null);
  return parents.map(parent => ({
    ...parent,
    children: children.filter(child => child.parentId === parent.id)
  }));
}

/** 按路径查找路由 */
export function findRouteByPath(path: string, routes: Array<any> = []): any {
  for (const route of routes) {
    if (route.path === path) return route;
    const found = findRouteByPath(path, route.children ?? []);
    if (found) return found;
  }
  return undefined;
}

/**
 * keep-alive 缓存处理：把页面组件名写入/移出 permission store 的缓存列表。
 * 顶级叶子路由注册名带 Layout 后缀，include 匹配的是内层页面组件名，需剥掉。
 */
export function handleAliveRoute(
  route: any,
  mode: "add" | "delete" | "refresh" = "refresh"
): void {
  const name =
    typeof route?.name === "string"
      ? route.name.replace(/Layout$/, "")
      : undefined;
  if (!name) return;
  const permissionStore = usePermissionStoreHook();
  switch (mode) {
    case "add":
      if (route.meta?.keepAlive) permissionStore.cacheOperate("add", name);
      break;
    case "delete":
      permissionStore.cacheOperate("delete", name);
      break;
    default:
      break;
  }
}

/** 获取首个可访问的顶级菜单（登录后跳转用） */
export function getTopMenu(ensurePath = true): any {
  const menus = usePermissionStoreHook().wholeMenus;
  const first = menus[0];
  const target =
    first && Array.isArray(first.children) && first.children.length
      ? first.children[0]
      : first;
  if (!target) return { path: "/welcome" };
  return ensurePath ? { ...target, path: target.path } : target;
}

// ---------------------------------------------------------------------------
// 动态路由：component 字符串 → 真实组件
// ---------------------------------------------------------------------------

/** 全部页面组件（懒加载） */
const viewModules = import.meta.glob("../views/**/*.vue");

/**
 * 组件名映射表：api/routes.ts 的 component 字符串与实际文件不一致时在此映射。
 * - "crawl-sources/index" 实际复用 views/sources/index.vue
 * - "content/{tools,prompts,articles,news,mcps,repos,resources}/index"
 *   全部复用 views/content/ContentManager.vue（带 ContentTypeConfig props）
 */
const componentAliasMap: Record<string, string> = {
  "crawl-sources/index": "../views/sources/index.vue"
};

/** 内容管理 7 类菜单对应的 type 集合 */
const CONTENT_KEYS: Array<string> = [
  "tools",
  "prompts",
  "articles",
  "news",
  "mcps",
  "repos",
  "resources"
];

/** 创建渲染 ContentManager 的包装组件（捕获对应内容的差异化配置） */
function createContentPage(type: ContentType, routeName?: string) {
  const config = CONTENT_CONFIGS[type];
  return markRaw(
    defineComponent({
      // name = 路由名：KeepAlive include 与页签缓存按组件名匹配
      name: routeName || "ContentManagerPage",
      render() {
        return h(ContentManager, { config });
      }
    })
  );
}

/**
 * 把懒加载视图包一层以路由名命名的同步组件：
 * KeepAlive include 按组件名匹配，而异步组件在路由解析前拿不到 SFC 内的
 * defineOptions 名，统一由包装层提供名字。
 */
function createNamedPage(routeName: string | undefined, loader: () => Promise<any>) {
  const Inner = markRaw(defineAsyncComponent(loader));
  return markRaw(
    defineComponent({
      name: routeName || "AnonymousPage",
      render: () => h(Inner)
    })
  );
}

/** 把 component 字符串解析为真实组件（返回 undefined 表示未找到） */
function resolveViewComponent(component?: string) {
  if (!component || typeof component !== "string") return undefined;
  const target = componentAliasMap[component] ?? `../views/${component}.vue`;
  return viewModules[target];
}

/** 顶级叶子路由包裹 Layout 外壳，页面渲染在主内容区 */
function wrapWithLayout(route: any): any {
  return {
    path: route.path,
    name: `${route.name ?? route.path}Layout`,
    component: Layout,
    meta: { ...(route.meta ?? {}), backstage: true },
    children: [{ ...route, path: "" }]
  };
}

/**
 * 把后端/本地菜单表转换为真实路由表：
 * - 目录（有 children）补 Layout 组件
 * - 叶子解析 component 字符串；content/* 映射到 ContentManager 并注入 config
 * - 顶级叶子路由包裹 Layout
 * - 全部标记 meta.backstage = true
 */
export function addAsyncRoutes(arrRoutes: Array<any>, isTop = true): Array<any> {
  arrRoutes.forEach((v, index) => {
    v.meta = { ...(v.meta ?? {}), backstage: true };

    if (Array.isArray(v.children) && v.children.length) {
      addAsyncRoutes(v.children, false);
      // 目录级路由渲染 Layout 外壳
      v.component = Layout;
    } else {
      const key = typeof v.component === "string" ? v.component : "";
      const contentType =
        key.startsWith("content/") &&
        CONTENT_KEYS.includes(key.split("/")[1])
          ? (key.split("/")[1] as ContentType)
          : undefined;

      if (contentType) {
        // content/{type}/index → ContentManager + ContentTypeConfig
        v.component = createContentPage(contentType, v.name);
      } else {
        const loader = resolveViewComponent(key);
        if (!loader) {
          console.warn(`[router] 未找到组件「${key}」，已回退到空页面`);
        }
        v.component = createNamedPage(
          v.name,
          loader ?? viewModules["../views/empty/index.vue"]
        );
      }

      // 顶级叶子路由（无 children）包一层 Layout
      if (isTop && !isAllEmpty(v.path) && String(v.path).startsWith("/")) {
        arrRoutes[index] = wrapWithLayout(v);
      }
    }
  });
  return arrRoutes;
}

/** 处理动态路由并注册到 router */
function handleAsyncRoutes(routeList: Array<any>): void {
  if (!routeList?.length) return;
  const processed = addAsyncRoutes(cloneDeep(routeList));
  // 预注册 keep-alive 缓存名单（include 按页面组件名 = 路由名匹配）
  registerKeepAlive(processed);
  // formatFlatteningRoutes 依赖 buildHierarchyTree 填充的 parentId
  // 判定父子层级，漏掉它会把所有 children 拍空（页面永远渲染不出来）
  formatTwoStageRoutes(formatFlatteningRoutes(buildHierarchyTree(processed))).forEach(v => {
    router.addRoute(v as RouteRecordRaw);
  });
}

/** 递归把 meta.keepAlive 的叶子路由组件名加入缓存列表 */
function registerKeepAlive(routes: Array<any>): void {
  routes.forEach(v => {
    if (Array.isArray(v.children) && v.children.length) {
      registerKeepAlive(v.children);
    } else if (v.meta?.keepAlive && typeof v.name === "string") {
      usePermissionStoreHook().cacheOperate("add", v.name);
    }
  });
}

/** 初始化动态路由（登录后与刷新时调用） */
export function initRouter(): Promise<typeof router> {
  return new Promise((resolve, reject) => {
    getAsyncRoutes()
      .then(({ data }) => {
        const routeList = (data ?? []) as Array<any>;
        handleAsyncRoutes(routeList);
        // 菜单 = 静态菜单（保持层级）+ 动态菜单，过滤隐藏项后按 rank 排序
        const menus = ascending(
          [...constantMenus, ...routeList].filter(
            v => v?.meta?.showLink !== false
          )
        );
        usePermissionStoreHook().handleWholeMenus(menus);
        resolve(router);
      })
      .catch(reject);
  });
}

export { Layout, buildHierarchyTree };
