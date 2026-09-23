import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { getSpotlight } from "@/lib/spotlights";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getSpotlight(slug);
  if (item) {
    return {
      title: `${item.title} · 专题`,
      description: (item.description ?? item.title).slice(0, 150),
      alternates: { canonical: `${SITE_URL}/spotlight/${slug}` },
    };
  }
  return { title: "专题" };
}

export default function DetailMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
