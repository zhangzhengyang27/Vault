import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { compression, type Algorithm } from "vite-plugin-compression2";

/** 后端网关（NestJS，ai-portal-api）开发代理目标 */
const API_TARGET = "http://localhost:3001";

/**
 * VITE_COMPRESSION → 静态压缩产物（.gz/.br）：gzip / brotli / both，
 * 加 -clear 后缀则删除原文件；none 或未配置时关闭。
 * 产物供 nginx gzip_static 优先返回（见 docker/nginx.conf.template）。
 */
function createCompressionPlugins(mode: string): Plugin[] {
  const raw = (loadEnv(mode, process.cwd()).VITE_COMPRESSION ?? "none").trim();
  const deleteOriginalAssets = raw.endsWith("-clear");
  const kind = deleteOriginalAssets ? raw.slice(0, -"-clear".length) : raw;
  const algorithms: Algorithm[] =
    kind === "both"
      ? ["gzip", "brotli"]
      : kind === "gzip" || kind === "brotli"
        ? [kind]
        : [];
  if (algorithms.length === 0) return [];
  return [compression({ algorithms, deleteOriginalAssets })];
}

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

export default defineConfig(({ mode }) => ({
  plugins: [vue(), svgLoader(), iconsNewsCompat(), ...createCompressionPlugins(mode)],
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
}));
