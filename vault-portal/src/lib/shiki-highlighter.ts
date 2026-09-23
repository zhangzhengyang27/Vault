import type { Highlighter } from "shiki";

/** 文档站实际用到的语言白名单，避免 shiki 加载全部语言 */
export const SHIKI_LANGS = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "json",
  "bash",
  "shell",
  "markdown",
  "yaml",
  "python",
  "java",
  "sql",
  "vue",
  "go",
  "rust",
  "plaintext",
] as const;

/**
 * 懒加载的 Shiki highlighter 单例。
 * 用动态 import() 避免 shiki 运行时被同步打进首屏 chunk，
 * 仅当页面真实需要高亮时才下载。多个代码块共享同一实例。
 */
let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(
      ({ createHighlighter, createJavaScriptRegexEngine }) =>
        createHighlighter({
          themes: ["github-dark"],
          langs: [...SHIKI_LANGS],
          // 使用纯 JS 正则引擎，避免 WASM 在浏览器端加载失败
          engine: createJavaScriptRegexEngine(),
        }),
    );
  }
  return highlighterPromise;
}
