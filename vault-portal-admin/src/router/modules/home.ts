import { markRaw } from "vue";
import { HomeFilled } from "@element-plus/icons-vue";
import { home } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Home",
  component: Layout,
  redirect: "/welcome",
  meta: {
    icon: markRaw(HomeFilled),
    title: "首页",
    rank: home
  },
  children: [
    {
      path: "/welcome",
      name: "Welcome",
      component: () => import("@/views/welcome/index.vue"),
      meta: {
        title: "首页",
        showLink: false
      }
    }
  ]
} satisfies RouteConfigsTable;
