/**
 * 静态菜单：管理后台功能固定、不随角色变化（登录已在网关层限定 admin），
 * 因此不再从后端 /system/my-menus 拉取，改为本地声明，复用 pure-admin 的
 * 动态路由构建/权限过滤/菜单渲染流程（getAsyncRoutes 返回值结构保持不变）。
 */

type ApiRoute = {
  path: string;
  name: string;
  component?: string;
  meta: {
    title: string;
    icon: string;
    /** 菜单排序，pure-admin 按升序渲染（仅一级路由生效） */
    rank?: number;
    roles?: Array<string>;
    showLink?: boolean;
    /** iframe 菜单：真实外嵌 URL（由 iframe/index.vue 渲染） */
    iframeLink?: string;
    /** 外链菜单：不注册路由，侧边栏按 name=URL 新窗口打开 */
    isLink?: boolean;
  };
  children?: Array<ApiRoute>;
};

const ADMIN: Array<string> = ["admin"];

/** 管理后台菜单：path 与 src/views 目录一一对应（addAsyncRoutes 按 path 解析组件） */
const STATIC_ROUTES: Array<ApiRoute> = [
  {
    path: "/welcome",
    name: "Welcome",
    component: "welcome/index",
    meta: { title: "运营概览", icon: "ep:data-analysis", roles: ADMIN, rank: 1 }
  },
  {
    path: "/content",
    name: "ContentParent",
    meta: { title: "内容管理", icon: "ep:notebook", roles: ADMIN, rank: 2 },
    children: [
      {
        path: "/content/tools",
        name: "ContentTools",
        component: "content/tools/index",
        meta: { title: "工具管理", icon: "ep:monitor", roles: ADMIN }
      },
      {
        path: "/content/prompts",
        name: "ContentPrompts",
        component: "content/prompts/index",
        meta: { title: "提示词管理", icon: "ep:chat-dot-round", roles: ADMIN }
      },
      {
        path: "/content/articles",
        name: "ContentArticles",
        component: "content/articles/index",
        meta: { title: "文章管理", icon: "ep:reading", roles: ADMIN }
      },
      {
        path: "/content/news",
        name: "ContentNews",
        component: "content/news/index",
        meta: { title: "资讯管理", icon: "ep:news", roles: ADMIN }
      },
      {
        path: "/content/mcps",
        name: "ContentMcps",
        component: "content/mcps/index",
        meta: { title: "MCP 服务", icon: "ep:cpu", roles: ADMIN }
      },
      {
        path: "/content/repos",
        name: "ContentRepos",
        component: "content/repos/index",
        meta: { title: "开源项目", icon: "ep:link", roles: ADMIN }
      },
      {
        path: "/content/resources",
        name: "ContentResources",
        component: "content/resources/index",
        meta: { title: "学习资源", icon: "ep:collection", roles: ADMIN }
      }
    ]
  },
  {
    path: "/review",
    name: "Review",
    component: "review/index",
    meta: { title: "采集审核", icon: "ep:finished", roles: ADMIN, rank: 3 }
  },
  {
    path: "/sources",
    name: "Sources",
    component: "crawl-sources/index",
    meta: { title: "数据源管理", icon: "ep:connection", roles: ADMIN, rank: 4 }
  },
  {
    path: "/submissions",
    name: "Submissions",
    component: "submissions/index",
    meta: { title: "投稿审核", icon: "ep:edit", roles: ADMIN, rank: 5 }
  },
  {
    path: "/reports",
    name: "Reports",
    component: "reports/index",
    meta: { title: "举报管理", icon: "ep:warning-outline", roles: ADMIN, rank: 6 }
  },
  {
    path: "/users",
    name: "Users",
    component: "users/index",
    meta: { title: "用户管理", icon: "ep:user", roles: ADMIN, rank: 7 }
  },
  {
    path: "/categories",
    name: "Categories",
    component: "categories/index",
    meta: { title: "分类管理", icon: "ep:collection", roles: ADMIN, rank: 8 }
  },
  {
    path: "/community",
    name: "CommunityParent",
    meta: { title: "社区管理", icon: "ep:chat-line-square", roles: ADMIN, rank: 9 },
    children: [
      {
        path: "/community/posts",
        name: "CommunityPosts",
        component: "community/posts/index",
        meta: { title: "帖子管理", icon: "ep:chat-dot-square", roles: ADMIN }
      },
      {
        path: "/community/comments",
        name: "CommunityComments",
        component: "community/comments/index",
        meta: { title: "评论管理", icon: "ep:comment", roles: ADMIN }
      }
    ]
  },
  {
    path: "/monitor",
    name: "MonitorParent",
    meta: { title: "系统监控", icon: "ep:data-line", roles: ADMIN, rank: 10 },
    children: [
      {
        path: "/monitor/login-logs",
        name: "MonitorLoginLogs",
        component: "monitor/login-logs/index",
        meta: { title: "登录日志", icon: "ep:key", roles: ADMIN }
      },
      {
        path: "/monitor/oper-logs",
        name: "MonitorOperLogs",
        component: "monitor/oper-logs/index",
        meta: { title: "操作日志", icon: "ep:tickets", roles: ADMIN }
      },
      {
        path: "/monitor/online",
        name: "MonitorOnline",
        component: "monitor/online/index",
        meta: { title: "在线用户", icon: "ep:user-filled", roles: ADMIN }
      }
    ]
  }
];

/** 供路由守卫/菜单构建调用的入口：签名与原远程版本一致 */
export const getAsyncRoutes = () => {
  return Promise.resolve({
    code: 0,
    message: "ok",
    data: STATIC_ROUTES
  });
};
