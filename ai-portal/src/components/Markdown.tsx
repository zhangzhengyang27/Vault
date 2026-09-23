"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Terminal } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import MermaidBlock from "@/components/MermaidBlock";
import LazyCodeBlock from "@/components/LazyCodeBlock";

/** 中文安全的锚点 slug（与 TOC 共用同一算法） */
export function slugifyId(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "sec"
  );
}

/** 从 markdown 文本提取标题列表（供 TOC 使用） */
export function extractHeadings(md: string): { level: number; text: string; id: string }[] {
  const out: { level: number; text: string; id: string }[] = [];
  for (const line of md.split("\n")) {
    const m = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (m) {
      const text = m[2].replace(/[*_`]/g, "").trim();
      out.push({ level: m[1].length, text, id: slugifyId(text) });
    }
  }
  return out;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyToClipboard(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-zinc-700/80 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-800/60 px-3 py-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <Terminal size={11} />
          {lang || "text"}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "已复制" : "复制代码"}
        </button>
      </div>
      <LazyCodeBlock
        code={code}
        lang={lang}
        className="overflow-x-auto p-4 text-[13px] leading-relaxed [&_code]:font-mono [&_code]:bg-transparent [&_code]:p-0"
      />
    </div>
  );
}

/** 将 markdown 渲染为排版良好的 HTML（支持 GFM 表格 / 任务列表 / 代码块） */
export default function Markdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const md = useMemo(() => String(children ?? ""), [children]);

  return (
    <div
      className={`markdown-body text-sm leading-relaxed text-zinc-700 dark:text-zinc-200 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: c, node: _n, ..._rest }) => (
            <h1
              id={slugifyId(flatText(c))}
              className="mb-3 mt-6 scroll-mt-24 border-b border-zinc-200 pb-2 text-xl font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
            >
              {c}
            </h1>
          ),
          h2: ({ children: c, node: _n, ..._rest }) => (
            <h2
              id={slugifyId(flatText(c))}
              className="mb-3 mt-7 scroll-mt-24 text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              {c}
            </h2>
          ),
          h3: ({ children: c, node: _n, ..._rest }) => (
            <h3
              id={slugifyId(flatText(c))}
              className="mb-2 mt-5 scroll-mt-24 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {c}
            </h3>
          ),
          h4: ({ children: c, node: _n, ..._rest }) => (
            <h4
              id={slugifyId(flatText(c))}
              className="mb-2 mt-4 scroll-mt-24 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {c}
            </h4>
          ),
          p: ({ children: c, node: _n, ..._rest }) => (
            <p className="my-2.5 leading-relaxed">{c}</p>
          ),
          strong: ({ children: c, node: _n, ..._rest }) => (
            <strong className="font-semibold text-zinc-900 dark:text-zinc-50">{c}</strong>
          ),
          em: ({ children: c, node: _n, ..._rest }) => <em className="italic">{c}</em>,
          ul: ({ children: c, node: _n, ..._rest }) => (
            <ul className="my-2.5 list-disc space-y-1 pl-5">{c}</ul>
          ),
          ol: ({ children: c, node: _n, ..._rest }) => (
            <ol className="my-2.5 list-decimal space-y-1 pl-5">{c}</ol>
          ),
          li: ({ children: c, node: _n, ..._rest }) => <li className="leading-relaxed">{c}</li>,
          input: (props) => {
            const { node: _n, ...rest } = props as Record<string, unknown>;
            return (
              <input
                {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
                className="mr-1.5 inline-block align-middle accent-[#1677ff]"
              />
            );
          },
          a: ({ children: c, href, node: _n, ..._rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1677ff] underline decoration-[#1677ff]/40 underline-offset-2 hover:text-[#1677ff] dark:text-[#5aa0ff] dark:decoration-[#5aa0ff]/50"
            >
              {c}
            </a>
          ),
          blockquote: ({ children: c, node: _n, ..._rest }) => (
            <blockquote className="my-3 border-l-[3px] border-[#1677ff]/40 bg-[#1677ff]/5 py-1 pl-4 pr-3 italic text-zinc-600 dark:border-[#5aa0ff]/50 dark:bg-[#1677ff]/5 dark:text-zinc-300">
              {c}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-zinc-200 dark:border-zinc-700" />,
          table: ({ children: c, node: _n, ..._rest }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full border-collapse text-[13px]">{c}</table>
            </div>
          ),
          thead: ({ children: c, node: _n, ..._rest }) => (
            <thead className="bg-zinc-100 dark:bg-zinc-800">{c}</thead>
          ),
          th: ({ children: c, node: _n, ..._rest }) => (
            <th className="border-b border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
              {c}
            </th>
          ),
          td: ({ children: c, node: _n, ..._rest }) => (
            <td className="border-b border-zinc-200 px-3 py-2 align-top dark:border-zinc-700">
              {c}
            </td>
          ),
          tr: ({ children: c, node: _n, ..._rest }) => (
            <tr className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-900/40 dark:even:bg-zinc-900/80">
              {c}
            </tr>
          ),
          pre: ({ children: c, node: _n, ..._rest }) => {
            const codeEl = React.Children.toArray(c)[0] as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>;
            const lang = /language-([\w-]+)/.exec(codeEl?.props?.className || "")?.[1] || "text";
            const code = String(codeEl?.props?.children ?? "").replace(/\n$/, "");
            if (lang.toLowerCase() === "mermaid") {
              return <MermaidBlock code={code} />;
            }
            return <CodeBlock lang={lang} code={code} />;
          },
          code: ({ children: c, node: _n, className, ..._rest }) => {
            // 行内代码（块级 code 已被 pre 组件接管）
            return (
              <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px] text-rose-600 dark:bg-zinc-800 dark:text-rose-400">
                {c}
              </code>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

/** 把 ReactNode 拍平成纯文本（用于标题 id 生成） */
function flatText(node: React.ReactNode): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatText).join("");
  if (React.isValidElement(node)) {
    const p = node.props as { children?: React.ReactNode };
    return flatText(p?.children);
  }
  return "";
}
