import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/** 列表页静态 metadata 统一构造（详情页由各自 layout 的 generateMetadata 负责） */
export function listMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: `${SITE_URL}${opts.path}` },
  };
}
