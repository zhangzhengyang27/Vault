import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

/**
 * 管理后台 ESLint 扁平配置：
 * - Vue 3 SFC + TypeScript，prettier 兜底关闭样式冲突规则
 * - 代码库大量使用 any 做后端数据透传，显式 any 不作为错误
 * - 与模板约定一致：index.vue 单组件文件名不受 multi-word 限制
 */
export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "*.d.ts"]
  },
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  eslintConfigPrettier,
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      // ---- 项目约定放宽 ----
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // SFC 按目录组织（views/xxx/index.vue），文件名不再是组件语义
      "vue/multi-word-component-names": "off",
      // 模板里长 attr 行由 prettier 管理
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/html-indent": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/first-attribute-linebreak": "off",
      // defineProps/defineEmits 为编译宏，无需导入
      "vue/no-undef-properties": "off"
    }
  },
  {
    files: ["**/*.vue"],
    // SFC 的 defineOptions/defineProps 等宏由 vue 编译器处理
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaFeatures: { jsx: false },
        extraFileExtensions: [".vue"],
        sourceType: "module"
      }
    }
  },
  {
    // 工具型 ts 文件按模板惯例定义多个小组件（ReIcon/RePerms/路由包装层）
    files: ["src/components/**/*.ts", "src/router/**/*.ts"],
    rules: {
      "vue/one-component-per-file": "off"
    }
  }
);
