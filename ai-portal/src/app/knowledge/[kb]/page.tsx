"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  X,
  ArrowLeft,
  ArrowRight,
  FileText,
  ListTree,
  CheckCircle2,
  Circle,
  ExternalLink,
} from "lucide-react";
import Markdown, { extractHeadings } from "@/components/Markdown";
import PhaseBadge from "@/components/PhaseBadge";

interface ApiArticle {
  slug: string;
  title: string;
  summary: string;
  /** 列表接口不返回正文（undefined=未加载，""=加载完成但为空或加载失败） */
  content?: string;
  phase: string;
  knowledgeBase?: string | null;
  category?: { id: number; name: string; sortOrder?: number } | null;
}

interface CategoryGroup {
  name: string;
  sortOrder: number;
  docs: ApiArticle[];
}

interface KbMeta {
  description?: string | null;
  isPath?: boolean;
}

interface RelatedTool {
  id: number;
  slug: string;
  name: string;
  description: string;
  website?: string | null;
  category?: { name: string } | null;
}

export default function KBPage() {
  const { kb } = useParams<{ kb: string }>();
  const kbName = decodeURIComponent(kb ?? "");
  // key=kbName：切换知识库时整棵视图重挂载，文档/选中/进度等状态天然归零
  return <KnowledgeBaseView key={kbName} kbName={kbName} />;
}

function KnowledgeBaseView({ kbName }: { kbName: string }) {
  const [all, setAll] = useState<ApiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<KbMeta>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [relatedTools, setRelatedTools] = useState<RelatedTool[]>([]);
  const toolsCacheRef = useRef<Map<string, RelatedTool[]>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        // 全量拉取该知识库的文档：循环翻页直到取完。
        // 此前单次 limit=100，文档超过 100 篇时侧栏会静默缺文档
        const items: ApiArticle[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await fetch(
            `/api/articles?page=${page}&limit=100&knowledgeBase=${encodeURIComponent(kbName)}`,
            { signal: controller.signal },
          );
          if (!res.ok) break;
          const data = await res.json();
          const arr: ApiArticle[] = Array.isArray(data) ? data : data?.items ?? [];
          items.push(...arr);
          totalPages = Number(data?.totalPages) || 1;
          page += 1;
        } while (page <= totalPages);
        setAll(items);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setAll([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    (async () => {
      // 读取本地学习进度（挂载后异步恢复，避免水合不一致）；
      // localStorage 是同步读，放在请求前以免进度条闪 0
      try {
        const saved = localStorage.getItem(`kbpath:${kbName}`);
        if (saved) setCompleted(new Set(JSON.parse(saved) as string[]));
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch("/api/articles/knowledge-bases", {
          signal: controller.signal,
        });
        const data = await res.json();
        const self = (Array.isArray(data) ? data : []).find(
          (b: { name: string }) => b.name === kbName,
        );
        setMeta({
          description: self?.description ?? null,
          isPath: Boolean(self?.isPath),
        });
      } catch {
        /* 元数据缺失时按普通知识库渲染 */
      }
    })();
    return () => controller.abort();
  }, [kbName]);

  const toggleCompleted = (slug: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      try {
        localStorage.setItem(
          `kbpath:${kbName}`,
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const docs = useMemo(() => all, [all]);

  const groups = useMemo(() => {
    const byCat = new Map<string, CategoryGroup>();
    for (const a of docs) {
      const cat = a.category?.name ?? "未分类";
      const so = a.category?.sortOrder ?? 999;
      if (!byCat.has(cat)) byCat.set(cat, { name: cat, sortOrder: so, docs: [] });
      byCat.get(cat)!.docs.push(a);
    }
    return [...byCat.values()].sort((x, y) => x.sortOrder - y.sortOrder);
  }, [docs]);

  useEffect(() => {
    void (async () => {
      if (docs.length === 0 || selected) return;
      const fromUrl = new URLSearchParams(window.location.search).get("doc");
      if (fromUrl && docs.some((d) => d.slug === fromUrl)) {
        setSelected(fromUrl);
      } else {
        setSelected(docs[0].slug);
      }
    })();
  }, [docs, selected]);

  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search).get("doc");
      // 参数缺失（退回初始历史项）或已失效时回落到第一篇，与刷新后的表现一致
      setSelected(
        p && docs.some((d) => d.slug === p) ? p : (docs[0]?.slug ?? null),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [docs]);

  // 移动端抽屉打开时锁定 body 滚动
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const current = docs.find((d) => d.slug === selected) ?? null;

  // 当前文档提到的工具（按内容链接与工具官网匹配，带会话内缓存）
  useEffect(() => {
    if (!current?.slug) return;
    const cached = toolsCacheRef.current.get(current.slug);
    if (cached) {
      setRelatedTools(cached);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/articles/${encodeURIComponent(current.slug)}/related-tools`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? (data as RelatedTool[]) : [];
        toolsCacheRef.current.set(current.slug, list);
        setRelatedTools(list);
      } catch {
        /* ignore */
      }
    })();
    return () => controller.abort();
  }, [current]);

  // 正文按需加载：列表接口不返回 content，选中文档后单独拉取。
  // 加载中 = content 仍为 undefined；失败时落空串，避免骨架屏永久停留
  useEffect(() => {
    const slug = current?.slug;
    if (!slug || current?.content !== undefined) return;
    const controller = new AbortController();
    const markEmpty = () =>
      setAll((prev) =>
        prev.map((x) =>
          x.slug === slug && x.content === undefined ? { ...x, content: "" } : x,
        ),
      );
    (async () => {
      try {
        const res = await fetch(
          `/api/articles/${encodeURIComponent(slug)}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const d = await res.json();
          setAll((prev) =>
            prev.map((x) =>
              x.slug === slug ? { ...x, content: d.content ?? "" } : x,
            ),
          );
        } else {
          markEmpty();
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) markEmpty();
      }
    })();
    return () => controller.abort();
  }, [current]);

  const headings = useMemo(() => {
    if (!current?.content) return [];
    return extractHeadings(current.content).filter((h) => h.level >= 2 && h.level <= 4);
  }, [current]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  const flatIndex = docs.findIndex((d) => d.slug === selected);
  const prevDoc = flatIndex > 0 ? docs[flatIndex - 1] : null;
  const nextDoc =
    flatIndex >= 0 && flatIndex < docs.length - 1 ? docs[flatIndex + 1] : null;

  const selectDoc = (slug: string) => {
    setSelected(slug);
    setMobileOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("doc", slug);
    window.history.pushState({}, "", url.toString());
    // 滚到顶部，避免被导航栏遮挡
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCat = (name: string) =>
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

  const isPath = meta.isPath && groups.length > 1;

  const renderSidebar = () => {
    // 只有一个分类时直接平铺文章，不显示分组标题
    if (groups.length === 1) {
      return (
        <ul className="space-y-0.5">
          {groups[0].docs.map((d) => {
            const active = d.slug === selected;
            const done = completed.has(d.slug);
            return (
              <li key={d.slug}>
                <button
                  onClick={() => selectDoc(d.slug)}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[13px] leading-snug transition-colors ${
                    active
                      ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-[#1677ff] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-[#5aa0ff]"
                  }`}
                >
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate">{d.title}</span>
                  {done && (
                    <CheckCircle2
                      size={13}
                      className="ml-auto shrink-0 text-emerald-500"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      );
    }

    return (
    <nav className="space-y-1 text-sm">
      {groups.map((g, gi) => {
        // 学习路径模式固定展开：分组头只作标题展示，避免误点折叠导致文档"消失"
        const isCollapsed = !isPath && (collapsed[g.name] ?? false);
        return (
          <div key={g.name}>
            {isPath ? (
              <div className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1677ff]/10 text-[11px] font-bold text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
                  {gi + 1}
                </span>
                <span className="truncate">{g.name}</span>
                <span className="ml-auto text-[11px] font-normal text-zinc-400">{g.docs.length}</span>
              </div>
            ) : (
              <button
                onClick={() => toggleCat(g.name)}
                className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#1677ff] dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-[#5aa0ff]"
              >
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${!isCollapsed ? "rotate-90" : ""}`}
                />
                <span className="truncate">{g.name}</span>
                <span className="ml-auto text-[11px] font-normal text-zinc-400">{g.docs.length}</span>
              </button>
            )}
            {!isCollapsed && (
              <ul className="ml-4 space-y-0.5 border-l border-zinc-200 pl-2.5 py-0.5 dark:border-zinc-700">
                {g.docs.map((d) => {
                  const active = d.slug === selected;
                  const done = completed.has(d.slug);
                  return (
                    <li key={d.slug}>
                      <button
                        onClick={() => selectDoc(d.slug)}
                        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors ${
                          active
                            ? "bg-[#1677ff]/10 font-medium text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]"
                            : "text-zinc-500 hover:bg-zinc-100 hover:text-[#1677ff] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-[#5aa0ff]"
                        }`}
                      >
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate">{d.title}</span>
                        {done && (
                          <CheckCircle2
                            size={13}
                            className="ml-auto shrink-0 text-emerald-500"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
    );
  };

  return (
    <div className="relative w-screen left-1/2 -ml-[50vw] -mt-10">
      {/* 全宽突破：抵消父容器限制 */}
      <div className="px-4 pt-4 pb-12 md:px-8 lg:pr-8 xl:pr-12">
        {/* 面包屑 */}
        <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
          <Link
            href="/"
            className="transition-colors hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
          >
            首页
          </Link>
          <span className="mx-0.5">/</span>
          <Link
            href="/knowledge"
            className="inline-flex items-center gap-1 transition-colors hover:text-[#1677ff] dark:hover:text-[#5aa0ff]"
          >
            <BookOpen size={14} /> 知识库
          </Link>
          <span className="mx-0.5">/</span>
          <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
            {kbName}
          </span>
        </nav>

        <div className="lg:flex lg:gap-5">
          {/* 左侧文档导航：白卡容器 */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {kbName}
                </p>
                {meta.description && (
                  <p className="mb-4 mt-2 text-xs leading-5 text-zinc-400 dark:text-zinc-500">
                    {meta.description}
                  </p>
                )}
                {!meta.description && <div className="mb-3" />}
                {isPath && docs.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                      <span>学习进度</span>
                      <span>
                        {docs.filter((d) => completed.has(d.slug)).length}/{docs.length}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1677ff] to-[#69b1ff] transition-all"
                        style={{
                          width: `${docs.length ? (docs.filter((d) => completed.has(d.slug)).length / docs.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {renderSidebar()}
              </div>
            </div>
          </aside>

          {/* 中间正文：白卡阅读区 */}
          <section ref={contentRef} className="min-w-0 flex-1">
            {/* 移动端目录按钮 */}
            <button
              onClick={() => setMobileOpen(true)}
              className="mb-4 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 transition-colors hover:text-[#1677ff] lg:hidden dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
            >
              <ListTree size={15} className="text-[#1677ff] dark:text-[#5aa0ff]" />
              目录
            </button>

            {loading ? (
              <div className="h-72 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            ) : !current ? (
              <div className="rounded-lg bg-white py-20 text-center dark:bg-zinc-900">
                <p className="text-zinc-500 dark:text-zinc-400">该知识库暂无文档。</p>
                <Link
                  href="/knowledge"
                  className="mt-4 inline-block text-sm font-medium text-[#1677ff] transition-colors hover:text-[#4096ff] dark:text-[#5aa0ff] dark:hover:text-[#5aa0ff]"
                >
                  返回知识库
                </Link>
              </div>
            ) : (
              <div className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#1677ff]/10 px-2 py-0.5 text-xs font-medium text-[#1677ff] dark:bg-[#5aa0ff]/10 dark:text-[#5aa0ff]">
                    {current.category?.name ?? "未分类"}
                  </span>
                  <PhaseBadge phase={current.phase} />
                  {isPath && (
                    <button
                      onClick={() => toggleCompleted(current.slug)}
                      className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        completed.has(current.slug)
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {completed.has(current.slug) ? (
                        <>
                          <CheckCircle2 size={14} /> 已完成
                        </>
                      ) : (
                        <>
                          <Circle size={14} /> 标记完成
                        </>
                      )}
                    </button>
                  )}
                </div>
                <h1 className="mt-3 text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
                  {current.title}
                </h1>
                {current.summary ? (
                  <p className="mt-3 rounded-lg bg-zinc-100 px-4 py-3 text-sm leading-6 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {current.summary}
                  </p>
                ) : null}
                <div className="mt-6 [&_.markdown-body]:text-base [&_.markdown-body]:leading-7">
                  {current.content === undefined ? (
                    <div className="space-y-3" aria-hidden>
                      {[92, 100, 78, 96, 64].map((w, i) => (
                        <div
                          key={i}
                          className="h-4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Markdown>{current.content}</Markdown>
                  )}
                </div>

                {/* 上一篇 / 下一篇 */}
                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  {prevDoc ? (
                    <button
                      onClick={() => selectDoc(prevDoc.slug)}
                      className="group flex items-center gap-2 rounded-lg bg-zinc-100 p-3 text-left transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70"
                    >
                      <ArrowLeft
                        size={16}
                        className="shrink-0 text-zinc-400 group-hover:text-[#1677ff] dark:group-hover:text-[#5aa0ff]"
                      />
                      <span className="min-w-0">
                        <span className="block text-[11px] text-zinc-400">上一篇</span>
                        <span className="block truncate text-sm text-zinc-700 transition-colors group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                          {prevDoc.title}
                        </span>
                      </span>
                    </button>
                  ) : (
                    <span />
                  )}
                  {nextDoc ? (
                    <button
                      onClick={() => selectDoc(nextDoc.slug)}
                      className="group flex items-center justify-end gap-2 rounded-lg bg-zinc-100 p-3 text-right transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70"
                    >
                      <span className="min-w-0">
                        <span className="block text-[11px] text-zinc-400">下一篇</span>
                        <span className="block truncate text-sm text-zinc-700 transition-colors group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                          {nextDoc.title}
                        </span>
                      </span>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-zinc-400 group-hover:text-[#1677ff] dark:group-hover:text-[#5aa0ff]"
                      />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>

                {/* 文中提到的工具 / 数据源 */}
                {relatedTools.length > 0 && (
                  <div className="mt-8 rounded-lg bg-zinc-100 p-5 dark:bg-zinc-800">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#1677ff] to-[#69b1ff]" />
                      文中提到的工具与数据源
                    </h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {relatedTools.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/tools/${t.slug}`}
                          className="group flex items-center gap-2.5 rounded-md bg-white p-2.5 transition hover:bg-[#1677ff]/5 dark:bg-zinc-900 dark:hover:bg-[#5aa0ff]/10"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff] to-[#69b1ff] text-xs font-bold text-white">
                            {t.name.charAt(0)}
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1 truncate text-[13px] font-medium text-zinc-800 transition-colors group-hover:text-[#1677ff] dark:text-zinc-100 dark:group-hover:text-[#5aa0ff]">
                              {t.name}
                              <ExternalLink size={11} className="shrink-0 opacity-40" />
                            </span>
                            <span className="block truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                              {t.category?.name ?? "工具"}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 右侧文章内 TOC：白卡容器 */}
          <aside className="hidden xl:block w-56 shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {headings.length > 0 && (
                <nav className="rounded-lg bg-white p-4 text-[13px] dark:bg-zinc-900">
                  <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">本页目录</p>
                  <ul className="space-y-0.5 border-l border-zinc-200 dark:border-zinc-700">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                            setActiveHeading(h.id);
                          }}
                          className={`block -ml-px border-l-2 py-1 leading-snug transition-colors ${
                            h.level === 2 ? "pl-3" : h.level === 3 ? "pl-6" : "pl-9"
                          } ${
                            activeHeading === h.id
                              ? "border-[#1677ff] font-medium text-[#1677ff] dark:border-[#5aa0ff] dark:text-[#5aa0ff]"
                              : "border-transparent text-zinc-500 hover:text-[#1677ff] dark:text-zinc-400 dark:hover:text-[#5aa0ff]"
                          }`}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[82%] overflow-y-auto bg-white p-4 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {kbName} · 目录
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            {renderSidebar()}
          </div>
        </div>
      )}
    </div>
  );
}
