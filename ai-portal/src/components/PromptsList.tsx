"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { PromptCard, PromptImageCard } from "@/components/cards";
import PromptEditor from "@/components/PromptEditor";
import Skeleton from "@/components/Skeleton";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/lib/auth";
import {
  getListCache,
  setListCache,
  type CachedPrompt,
} from "@/lib/promptListState";

interface ApiAttachment {
  type: string;
  url: string;
  name: string;
  width?: number;
  height?: number;
}

interface ApiPrompt {
  slug: string;
  title: string;
  description: string;
  category?: { name: string } | null;
  author: string;
  uses: number;
  phase: string;
  source?: string;
  attachments?: ApiAttachment[] | null;
  content?: string;
}

interface ApiCategory {
  id: number;
  name: string;
  parentId: number | null;
}

const PAGE_SIZE = 12;

const CONTENT_TAXONOMY: [string, string[]][] = [
  ["动漫二次元", ["动漫", "二次元", "新海诚", "anime", "manga", "卡通", "吉卜力"]],
  ["艺术国画", ["中国画", "国画", "吴冠中", "禅意", "水墨", "工笔", "宣纸", "笔触"]],
  ["插画手绘", ["插画", "手绘", "平面插画", "illustration", "绘本", "扁平插画", "手账"]],
  ["动物萌宠", ["猫", "狗", "cat", "dog", "动物", "宠物", "兔子", "小狗"]],
  ["美食", ["美食", "餐饮", "菜单", "蛋糕", "cake", "food", "咖啡", "料理", "甜点", "食物", "菜品"]],
  ["建筑室内", ["室内", "建筑", "平面布局", "户型", "家装", "三居室", "客厅", "厨房", "房间", "卧室", "家居"]],
  ["电商产品", ["电商", "产品", "服饰", "包装", "商品", "品牌", "店铺", "模特", "穿搭", "服装", "衣物"]],
  ["风景摄影", ["风景", "摄影", "写真", "风光", "photorealistic", "写实", "雪山", "湖泊", "日出", "日落", "自然", "landscape", "photo", "天空", "花海", "山水", "mountain", "lake", "sunrise", "sunset", "forest", "海", "草原", "晨光"]],
  ["人物人像", ["人物", "人像", "女性", "男性", "portrait", "自拍", "头像", "女孩", "男孩"]],
  ["海报信息图", ["信息图", "infographic", "海报", "封面", "排版", "banner", "知识科普", "科普"]],
];

function contentCategory(content?: string): string {
  const text = (content || "").toLowerCase();
  for (const [cat, keys] of CONTENT_TAXONOMY) {
    if (keys.some((k) => text.includes(k.toLowerCase()))) return cat;
  }
  return "其他";
}

const NON_IMAGE_STRONG =
  /报告|文档|ppt|论文|教案|简历|合同|代码|脚本|邮件|周报|月报|大纲|提纲|总结报告|演讲稿|话术|运营方案|社群|教程|课程|试卷|题库|教学设计|策划案|方案书|说明书|使用手册|分析报告|研究报|文章|公众号|小红书|短视频|口播|朋友圈|微博|文案|读后感|读书笔记|心得体会|讲稿|新闻稿|推文/;
const STRONG_IMAGE =
  /生成图像|生成一张|插画|漫画|摄影|人像|头像|海报|logo|图标|3d|渲染|手绘|动画|动漫|写真|壁纸|主图|商品图|信息图|流程图|示意图|架构图|思维导图|封面图|背景图|像素画|油画|水彩/;
const VIDEO_STRONG =
  /运镜|景别|分镜|镜头语言|帧序列|视频生成|视频分镜|mg动画|动态视频|生成视频|视频脚本|视频拍摄|产品展示视频|镜头环绕|环绕拍摄|时长约/;
const WEAK_IMAGE = [
  "图像", "图片", "画", "视觉", "生成图", "风格", "构图", "光线",
  "draw", "paint", "render", "photo", "landscape", "image", "visual", "art",
];
const NON_IMAGE_OVERRIDE =
  /ppt|课件|工作总结|design system|视觉规范|设计规范|视觉指南|风格指南|产品展示视频/;
export function isImageGenrePrompt(content?: string): boolean {
  const t = (content || "").toLowerCase();
  if (NON_IMAGE_OVERRIDE.test(t)) return false;
  if (NON_IMAGE_STRONG.test(t) && !STRONG_IMAGE.test(t)) return false;
  if (STRONG_IMAGE.test(t)) return true;
  if (VIDEO_STRONG.test(t)) return false;
  if (NON_IMAGE_STRONG.test(t)) return false;
  if (WEAK_IMAGE.some((k) => t.includes(k))) return true;
  return (
    contentCategory(content) !== "其他" ||
    /科技|未来|赛博|科技感|悬浮|全息|ui|界面|数据可视化|机械|概念|元宇宙|科幻|霓虹/.test(t)
  );
}

export default function PromptsList({
  kind,
  title,
  subtitle,
  media,
}: {
  kind: "general" | "precise";
  title: string;
  subtitle?: string;
  media?: "image" | "text";
}) {
  const CACHE_KEY = `${kind}:${media ?? "none"}`;
  const cached = getListCache(CACHE_KEY);

  const [prompts, setPrompts] = useState<ApiPrompt[]>(cached?.prompts ?? []);
  const [cats, setCats] = useState<string[]>(["全部"]);
  const [cat, setCat] = useState(cached?.cat ?? (media === "text" ? "网页生成" : "全部"));
  const [contentCat, setContentCat] = useState(cached?.contentCat ?? "全部");
  // 类型筛选暂只从缓存读取（未接入切换 UI），故不取 setter
  const [typeFilter] = useState(cached?.typeFilter ?? "全部");
  const [sort, setSort] = useState<string>(
    cached?.sort ?? (kind === "precise" ? "uses" : "default"),
  );
  const [page, setPage] = useState(cached?.page ?? 1);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
  const [loading, setLoading] = useState(!cached?.prompts);
  const [editorOpen, setEditorOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const handleDelete = useCallback(
    async (slug: string) => {
      if (!window.confirm(`确定删除提示词「${slug}」？此操作不可恢复。`)) return;
      if (!user) {
        window.alert("请先登录后再删除。");
        return;
      }
      try {
        const res = await fetch(`/api/prompts/${slug}`, {
          method: "DELETE",
        });
        if (res.status === 401) {
          window.alert("登录已失效，请重新登录后再删除。");
          return;
        }
        if (!res.ok) {
          window.alert("删除失败，请重试。");
          return;
        }
        setPrompts((list) => list.filter((p) => p.slug !== slug));
      } catch {
        window.alert("删除失败，网络异常。");
      }
    },
    [user],
  );

  const restoredRef = useRef<boolean>(!!cached?.prompts);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((list) => {
        const arr: ApiCategory[] = Array.isArray(list) ? list : [];
        const names = arr.filter((c) => c.parentId === null).map((c) => c.name);
        setCats(["全部", ...names]);
      })
      .catch(() => setCats(["全部"]));
  }, []);

  const isImageMode = media === "image";
  const isTextMode = media === "text";
  const pagerMode = kind === "general";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loadLimit = isImageMode ? 500 : isTextMode ? 800 : PAGE_SIZE;
      const params = new URLSearchParams({
        kind,
        page: String(page),
        limit: String(loadLimit),
      });
      if (media) params.set("media", media);
      if (!isImageMode && cat !== "全部") params.set("category", cat);
      if (sort !== "default") params.set("sort", sort);
      const res = await fetch(`/api/prompts?${params.toString()}`);
      const data = await res.json();
      setPrompts(Array.isArray(data) ? data : data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [kind, media, cat, sort, page, isImageMode, isTextMode]);

  useEffect(() => {
    if (restoredRef.current) {
      restoredRef.current = false;
      const y = getListCache(CACHE_KEY)?.scrollY ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, y));
      return;
    }
    load();
  }, [load, CACHE_KEY]);

  useEffect(() => {
    setListCache(CACHE_KEY, {
      prompts: prompts as CachedPrompt[],
      cat,
      contentCat,
      typeFilter,
      sort,
      page,
      totalPages,
    });
  }, [prompts, cat, contentCat, typeFilter, sort, page, totalPages, CACHE_KEY]);

  useEffect(() => {
    return () => {
      setListCache(CACHE_KEY, { scrollY: window.scrollY });
    };
  }, [CACHE_KEY]);

  useEffect(() => {
    void (async () => {
      if (typeof window !== "undefined") {
        const c = new URLSearchParams(window.location.search).get("cat");
        if (c) setCat(c);
      }
    })();
  }, []);

  function selectCat(c: string) {
    setCat(c);
    setPage(1);
  }

  function selectContentCat(c: string) {
    setContentCat(c);
  }

  function selectSort(s: string) {
    setSort(s);
    setPage(1);
  }

  const firstImage = (p: ApiPrompt) =>
    (p.attachments ?? []).find((a) => a.type === "image")?.url ?? null;

  const isImagePrompt = (p: ApiPrompt) =>
    kind === "precise" && !!firstImage(p);

  const imagePrompts = prompts.filter(isImagePrompt);
  const textPrompts = prompts.filter((p) => !isImagePrompt(p));

  const visibleText = useMemo(() => {
    if (typeFilter === "全部") return textPrompts;
    const wantImg = typeFilter === "图片";
    return textPrompts.filter((p) => isImageGenrePrompt(p.content) === wantImg);
  }, [textPrompts, typeFilter]);

  const textModeCats = useMemo(() => {
    if (!isTextMode) return cats;
    return cats.includes("网页生成") ? ["全部", "网页生成"] : ["全部"];
  }, [isTextMode, cats]);

  const contentCats = useMemo(() => {
    const set = new Set(imagePrompts.map((p) => contentCategory(p.content)));
    const arr = Array.from(set);
    arr.sort((a, b) =>
      a === "其他" ? 1 : b === "其他" ? -1 : a.localeCompare(b, "zh"),
    );
    return arr;
  }, [imagePrompts]);

  // 三个提示词子站的导航 tab（/prompts、/prompts/precise、/prompts/text 互为入口）
  const MODE_TABS = [
    { href: "/prompts", label: "通用提示词" },
    { href: "/prompts/precise", label: "图片画廊" },
    { href: "/prompts/text", label: "网页生成" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          <button
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus size={16} /> 新增
          </button>
        }
      />

      <nav className="flex flex-wrap gap-2" aria-label="提示词分类导航">
        {MODE_TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-500/60 dark:hover:text-indigo-400"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {isImageMode ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">排序</span>
            {([
              ["uses", "热门"],
              ["newest", "最新"],
              ["default", "默认"],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => selectSort(v)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sort === v
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {contentCats.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => selectContentCat("全部")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  contentCat === "全部"
                    ? "bg-violet-600 text-white dark:bg-violet-500"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                全部
              </button>
              {contentCats.map((c) => (
                <button
                  key={c}
                  onClick={() => selectContentCat(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    contentCat === c
                      ? "bg-violet-600 text-white dark:bg-violet-500"
                      : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : pagerMode ? (
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => selectCat(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                cat === c
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">分类</span>
            {textModeCats.map((c) => (
              <button
                key={c}
                onClick={() => selectCat(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  cat === c
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">排序</span>
            {([
              ["uses", "热门"],
              ["newest", "最新"],
              ["default", "默认"],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => selectSort(v)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sort === v
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mb-4 h-48" />
          ))}
        </div>
      ) : isImageMode ? (
        imagePrompts.length === 0 ? (
          <EmptyState
            title="该分类下暂无提示词"
            description="点击右上角「新增」创建第一条。"
            actionLabel="新增提示词"
            onAction={() => setEditorOpen(true)}
          />
        ) : (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {imagePrompts
              .filter(
                (p) =>
                  contentCat === "全部" ||
                  contentCategory(p.content) === contentCat,
              )
              .map((p) => {
                const att = (p.attachments ?? []).find(
                  (a) => a.type === "image",
                );
                return (
                  <PromptImageCard
                    key={p.slug}
                    onDelete={handleDelete}
                    prompt={{
                      slug: p.slug,
                      title: p.title,
                      image: firstImage(p) ?? "",
                      author: p.author,
                      uses: p.uses,
                      content: p.content,
                      imgWidth: att?.width,
                      imgHeight: att?.height,
                    }}
                  />
                );
              })}
          </div>
        )
      ) : visibleText.length === 0 ? (
        <EmptyState
          title="该分类下暂无提示词"
          description="点击右上角「新增」创建第一条。"
          actionLabel="新增提示词"
          onAction={() => setEditorOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {visibleText.map((p) => (
            <PromptCard
              key={p.slug}
              onDelete={handleDelete}
              prompt={{
                slug: p.slug,
                title: p.title,
                desc: p.description,
                category: p.category?.name ?? "未分类",
                author: p.author,
                uses: p.uses,
                phase: p.phase,
                isNew: p.author === "Tbox 社区",
                manual: p.source === "manual",
              }}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <PromptEditor
        open={editorOpen}
        defaultKind={kind}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          setPage(1);
          load();
        }}
      />
    </div>
  );
}
