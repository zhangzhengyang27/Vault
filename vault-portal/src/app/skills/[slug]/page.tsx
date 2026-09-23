"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Layers,
  Copy,
  Check,
  FolderCog,
  Calendar,
  ExternalLink,
} from "lucide-react";
import PhaseBadge from "@/components/PhaseBadge";
import DetailLayout from "@/components/DetailLayout";
import ShareButton from "@/components/ShareButton";
import FavoriteButton from "@/components/FavoriteButton";
import LikeButton from "@/components/LikeButton";
import HistoryTracker from "@/components/HistoryTracker";
import { SidebarCard } from "@/components/directory";
import { copyToClipboard } from "@/lib/clipboard";
import { fetchAllList } from "@/lib/fetchList";
import { getMcpLogo } from "@/lib/mcpLogos";

interface ApiSkill {
  id: number;
  slug: string;
  name: string;
  description?: string;
  endpoint?: string;
  type: string;
  tags?: string[];
  phase: string;
  createdAt: string;
  sourceUrl?: string | null;
}

export default function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [skill, setSkill] = useState<ApiSkill | null>(null);
  const [related, setRelated] = useState<ApiSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/mcps/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setMissing(true);
          return;
        }
        const data = await res.json();
        if (data?.type !== "skill") {
          setMissing(true);
          return;
        }
        setSkill(data);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setMissing(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [slug]);

  // 同分类推荐：全量拉取（API 单次 limit 上限 100，条目增长后截断会漏推荐）
  useEffect(() => {
    if (!skill) return;
    const controller = new AbortController();
    (async () => {
      try {
        const all = await fetchAllList<ApiSkill>("/api/mcps?type=skill", {
          signal: controller.signal,
        });
        const same = all.filter(
          (s) =>
            s.slug !== skill.slug &&
            (skill.tags ?? []).some((t) => (s.tags ?? []).includes(t)),
        );
        setRelated(same.slice(0, 4));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setRelated([]);
      }
    })();
    return () => controller.abort();
  }, [skill]);

  const handleCopyPath = async () => {
    if (!skill?.endpoint) return;
    const ok = await copyToClipboard(skill.endpoint);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 直达链接进入时 history 中没有站内上一页，back 会退出站点
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/skills");
    }
  };

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    );
  }

  if (missing || !skill) {
    return (
      <div className="rounded-lg bg-white py-20 text-center dark:bg-zinc-900">
        <Layers className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">技能未找到。</p>
        <Link
          href="/skills"
          className="mt-4 inline-block text-sm font-medium text-[#1677ff] transition hover:text-[#4096ff] dark:text-[#5aa0ff]"
        >
          返回 Skills
        </Link>
      </div>
    );
  }

  const logo = getMcpLogo(skill.slug);

  const breadcrumb = [
    { label: "Skills", href: "/skills" },
    { label: skill.name },
  ];

  const main = (
    <div className="rounded-lg bg-white p-5 dark:bg-zinc-900 sm:p-6">
      {/* 主信息头：56px 渐变圆 logo + 28px 标题 + 灰简介 + tag 药丸 */}
      <div className="flex items-start gap-4">
        {logo ? (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <Image
              src={logo}
              alt={skill.name}
              width={56}
              height={56}
              className="h-full w-full object-contain"
            />
          </span>
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1677ff]/90 to-[#69b1ff]/90 text-xl font-bold text-white">
            {skill.name.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
            {skill.name}
            <span className="ml-2 rounded-md bg-zinc-100 px-1.5 py-0.5 align-middle font-mono text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {skill.slug}
            </span>
          </h1>
          {skill.description && (
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {skill.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(skill.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {t}
              </span>
            ))}
            <PhaseBadge phase={skill.phase} />
          </div>
        </div>
      </div>

      {/* 正文：使用说明（text-base leading-7） */}
      {(skill.endpoint || skill.sourceUrl) && (
        <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            安装与使用
          </h2>
          <p className="mt-3 text-base leading-7 text-zinc-800 dark:text-zinc-200">
            将技能文件夹复制到安装位置对应的目录后，AI
            会在相关任务中自动发现并调用，无需手动触发。
            {skill.sourceUrl
              ? "技能文件的实际出处见下方来源仓库，可从该仓库获取技能文件夹后复制到安装目录。"
              : ""}
          </p>
        </div>
      )}

      {/* 安装位置：灰底 code 样式 + 一键复制 */}
      {skill.endpoint && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <FolderCog size={14} /> 安装位置
            </p>
            <button
              onClick={handleCopyPath}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#1677ff] px-3 py-1.5 text-xs text-white transition hover:bg-[#4096ff]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "已复制" : "复制路径"}
            </button>
          </div>
          <code className="mt-2 block break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {skill.endpoint}
          </code>
        </div>
      )}

      {/* 来源仓库：技能文件的实际出处 */}
      {skill.sourceUrl && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <ExternalLink size={14} /> 来源仓库
          </p>
          <a
            href={skill.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 transition hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
          >
            {skill.sourceUrl}
          </a>
        </div>
      )}
    </div>
  );

  const sidebar = (
    <>
      {/* 相关 Skills */}
      {related.length > 0 && (
        <SidebarCard title="相关 Skills">
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/skills/${r.slug}`} className="group block">
                  <p className="truncate text-sm text-zinc-700 transition group-hover:text-[#1677ff] dark:text-zinc-200 dark:group-hover:text-[#5aa0ff]">
                    {r.name}
                  </p>
                  {r.description && (
                    <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                      {r.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </SidebarCard>
      )}

      {/* 操作卡：收藏 / 点赞 / 分享 / 返回 */}
      <SidebarCard title="操作">
        <div className="mt-3 space-y-2">
          {skill.id ? (
            <FavoriteButton
              targetType="skill"
              targetId={skill.id}
              targetSlug={skill.slug}
              title={skill.name}
            />
          ) : null}
          {skill.id ? (
            <LikeButton targetType="skill" targetId={skill.id} />
          ) : null}
          <ShareButton title={skill.name} />
          <button
            onClick={handleBack}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600 transition hover:text-[#1677ff] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-[#5aa0ff]"
          >
            返回列表
          </button>
        </div>
      </SidebarCard>

      {/* 元信息卡 */}
      <SidebarCard title="元信息">
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">状态</span>
            <PhaseBadge phase={skill.phase} />
          </div>
          {skill.createdAt && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <Calendar size={13} /> 收录时间
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {new Date(skill.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
          )}
          {(skill.tags ?? []).length > 0 && (
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">标签</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(skill.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </SidebarCard>
    </>
  );

  return (
    <>
      <HistoryTracker type="skill" slug={skill.slug} title={skill.name} path={`/skills/${skill.slug}`} />
      <DetailLayout breadcrumb={breadcrumb} main={main} sidebar={sidebar} />
    </>
  );
}
