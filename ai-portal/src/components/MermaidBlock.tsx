"use client";

import { useEffect, useRef, useState } from "react";

/**
 * mermaid 体积较大，采用按需动态加载：
 * 只有页面里出现 mermaid 代码块时才下载 mermaid chunk，
 * 不带流程图的文档不会把整套库扛进客户端 bundle。
 * 模块级缓存避免同一页多个图表重复加载，configure 只执行一次。
 */
let mermaidPromise: Promise<typeof import("mermaid")> | null = null;
let configured = false;

function loadMermaid(): Promise<typeof import("mermaid")> {
  if (!mermaidPromise) mermaidPromise = import("mermaid");
  return mermaidPromise;
}

let uid = 0;

/** mermaid v11 兼容性预处理 */
function sanitizeMermaid(code: string): string {
  return code
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/\[([^\]["]*)\]/g, (match, label: string) => {
      const trimmed = label.trim();
      if (!/[()]/.test(trimmed)) return match;
      return `["${trimmed}"]`;
    });
}

interface MermaidBlockProps {
  code: string;
}

/** Mermaid 图表渲染组件：将 mermaid 源码渲染为 SVG，失败时回退显示源码 */
export default function MermaidBlock({ code }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++uid}`);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setSvg(null);
      setError(null);
    })();

    loadMermaid()
      .then((mod) => {
        if (!configured) {
          mod.default.initialize({
            startOnLoad: false,
            theme: "neutral",
            // strict（默认值）：禁用图内 HTML 标签与点击回调。
            // mermaid 源码可来自采集文章/用户投稿，loose 模式等于开放 XSS 注入面
            securityLevel: "strict",
          });
          configured = true;
        }
        return mod.default.render(idRef.current, sanitizeMermaid(code));
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  // 渲染失败：回退显示源码
  if (error) {
    return (
      <div className="my-4 overflow-hidden rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center justify-between border-b border-red-200 px-4 py-2 dark:border-red-900/40">
          <span className="text-xs font-medium text-red-500">MERMAID</span>
          <span className="text-xs text-red-400" title={error}>
            渲染失败
          </span>
        </div>
        <pre className="max-h-[480px] overflow-auto p-4 text-[13px] leading-[1.7] text-zinc-700 dark:text-zinc-300">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  // 渲染完成：显示图表
  if (svg) {
    return (
      <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div
          className="mermaid-svg flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    );
  }

  // 渲染中：占位
  return (
    <div className="my-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500">
      图表渲染中…
    </div>
  );
}
