/** 从文本中提取所有 http(s) 链接的主机名（去 www、去重、保序） */
export function extractUrlHosts(text: string): string[] {
  const hosts = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/g)) {
    try {
      const h = new URL(m[0]).hostname.toLowerCase().replace(/^www\./, '');
      if (h.includes('.')) hosts.add(h);
    } catch {
      // 非法 URL 忽略
    }
  }
  return [...hosts];
}

/** 取工具官网地址的主机名（归一化，非法返回 null） */
export function websiteHost(website: string): string | null {
  try {
    return new URL(website).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}
