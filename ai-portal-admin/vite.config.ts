import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";

/** 后端网关（NestJS，ai-portal-api）开发代理目标 */
const API_TARGET = "http://localhost:3001";

/**
 * Element Plus 图标集兼容补丁：welcome 页引用 News 图标，
 * 当前 @element-plus/icons-vue 版本未导出，构建时以 Document 补位导出。
 * （类型声明见 types/icons-compat.d.ts）
 */
const ICONS_NEWS_PATCH =
  "\nvar News_icon_compat = _defineComponent({ name: \"News\", render: () => null });\nexport { News_icon_compat as News };\n";
const ICONS_INDEX_RE = /[\\/]icons-vue[\\/]dist[\\/]index\.js$/;

function iconsNewsCompat(): Plugin {
  return {
    name: "icons-news-compat",
    enforce: "pre",
    load(id) {
      if (ICONS_INDEX_RE.test(id)) {
        return readFileSync(id, "utf-8") + ICONS_NEWS_PATCH;
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [vue(), svgLoader(), iconsNewsCompat()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "icons-news-compat-esbuild",
          setup(build) {
            build.onLoad({ filter: /icons-vue[\\/]dist[\\/]index\.js$/ }, args => {
              const contents =
                readFileSync(args.path, "utf-8") + ICONS_NEWS_PATCH;
              return { contents, loader: "js" };
            });
          }
        }
      ]
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  css: {
    postcss: fileURLToPath(new URL("./postcss.config.js", import.meta.url))
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true
      },
      "/uploads": {
        target: API_TARGET,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 4096
  }
});
