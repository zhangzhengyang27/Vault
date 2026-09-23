"use client";

import { useEffect, useRef, useState } from "react";
import { getHighlighter } from "@/lib/shiki-highlighter";

/**
 * 客户端懒高亮代码块。
 *
 * 服务端输出纯文本，客户端用 IntersectionObserver 在代码块进入视口时才做 Shiki 高亮，
 * 既降低首屏 HTML 体积与 DOM 节点数，又不牺牲滚动到代码时的彩色高亮。
 */
interface LazyCodeBlockProps {
  code: string;
  lang?: string;
  className?: string;
}

export default function LazyCodeBlock({
  code,
  lang = "plaintext",
  className,
}: LazyCodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  // null 表示尚未高亮（渲染纯文本），字符串表示高亮后的 <code> 内部 html
  const [codeHtml, setCodeHtml] = useState<string | null>(null);
  const prevCodeRef = useRef(code);

  useEffect(() => {
    const el = preRef.current;
    if (!el) return;

    // code 变化时重置高亮状态，让下一次 effect 重新高亮
    if (prevCodeRef.current !== code) {
      prevCodeRef.current = code;
      setCodeHtml(null);
      return;
    }
    if (codeHtml !== null) return;

    let done = false;
    let observer: IntersectionObserver | null = null;

    const run = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      getHighlighter()
        .then((hl) => {
          const loaded = hl.getLoadedLanguages().includes(lang as never);
          const out = hl.codeToHtml(code, {
            lang: loaded ? lang : "text",
            theme: "github-dark",
          });
          // Shiki 输出为 <pre class="shiki"><code>…</code></pre>，提取 <code> 内部 html
          const m = /<code[^>]*>([\s\S]*?)<\/code>/.exec(out);
          setCodeHtml(m ? m[1] : escapeHtml(code));
        })
        .catch(() => setCodeHtml(escapeHtml(code)));
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) run();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);

    return () => observer?.disconnect();
  }, [code, lang, codeHtml]);

  return (
    <pre ref={preRef} className={className}>
      {codeHtml === null ? (
        <code>{code}</code>
      ) : (
        <code dangerouslySetInnerHTML={{ __html: codeHtml }} />
      )}
    </pre>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
