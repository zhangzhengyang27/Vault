import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kb: string }>;
}): Promise<Metadata> {
  const { kb } = await params;
  const name = decodeURIComponent(kb);
  return {
    title: `${name} · AI 知识库`,
    description: `AI 知识库「${name}」的科普、教程与最佳实践文档。`,
    alternates: { canonical: `${SITE_URL}/knowledge/${kb}` },
  };
}

export default function DetailMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
