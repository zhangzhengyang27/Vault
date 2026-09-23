import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          // `_` 前缀表示「刻意忽略」：如解构剔除 node / rest 等
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          // 允许 `const { content, ...rest } = item` 这类借解构剔除字段的写法
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 演示页为外部来源的单文件 HTML/资源,不参与 lint
    "public/demos/**",
  ]),
]);

export default eslintConfig;
