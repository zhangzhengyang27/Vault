const Layout = () => import("@/layout/index.vue");

/**
 * 错误页路由（remaining.ts 缺失部分的补充）：
 * - 路由守卫在权限不足时会 push "/error/403"，隐藏首页时 push "/error/404"
 * - 未匹配路径走无 name 的 catch-all（带 name 会导致路由守卫刷新判断失效）
 */
export default [
  {
    path: "/error/403",
    name: "Error403",
    component: () => import("@/views/error/403.vue"),
    meta: {
      title: "403",
      showLink: false,
      rank: 998
    }
  },
  {
    path: "/error/404",
    name: "Error404",
    component: () => import("@/views/error/404.vue"),
    meta: {
      title: "404",
      showLink: false,
      rank: 998
    }
  },
  {
    path: "/error/500",
    name: "Error500",
    component: () => import("@/views/error/500.vue"),
    meta: {
      title: "500",
      showLink: false,
      rank: 998
    }
  },
  {
    path: "/:pathMatch(.*)*",
    component: () => import("@/views/error/404.vue"),
    meta: {
      title: "404",
      showLink: false,
      rank: 999
    }
  }
] satisfies Array<RouteConfigsTable>;

export { Layout };
