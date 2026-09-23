"use client";

import { useEffect } from "react";
import { useHistory } from "@/lib/useHistory";

interface HistoryTrackerProps {
  type: string;
  slug: string;
  title: string;
  path: string;
}

export default function HistoryTracker({ type, slug, title, path }: HistoryTrackerProps) {
  const { addHistory } = useHistory();

  useEffect(() => {
    addHistory({ type, slug, title, path });
  }, [type, slug, title, path, addHistory]);

  return null;
}
