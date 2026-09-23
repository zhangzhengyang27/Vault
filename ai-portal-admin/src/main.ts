import App from "./App.vue";
import { createApp } from "vue";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import { Perms, Auth } from "@/components/RePerms";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";
import VueTippy from "vue-tippy";
import { getPlatformConfig } from "@/config";
import { setupStore } from "@/store";
import router from "@/router";
import { injectResponsiveStorage } from "@/utils/responsive";
import "@/components/ReIcon/offline";
import "@/style/index.css";

const app = createApp(App);

// ElementPlus 全量引入（含 v-loading 等指令），中文 locale
app.use(ElementPlus, { locale: zhCn });
app.component("Auth", Auth);
app.component("Perms", Perms);

// 全局注册vue-tippy
app.use(VueTippy);

getPlatformConfig(app)
  .then(async config => {
    setupStore(app);
    app.use(router);
    await router.isReady();
    injectResponsiveStorage(app, config);
    app.mount("#app");
  })
  // 启动链失败时给出可见错误，避免静默白屏
  .catch(e => {
    console.error("[boot] 应用启动失败", e);
    document.getElementById("app")?.replaceChildren(
      Object.assign(document.createElement("pre"), {
        textContent: "应用启动失败：" + (e instanceof Error ? e.stack : String(e)),
        style: "padding:24px;color:#f56c6c;white-space:pre-wrap;font-size:13px"
      })
    );
  });
