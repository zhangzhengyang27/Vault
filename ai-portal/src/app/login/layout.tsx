import type { Metadata } from "next";
import type { ReactNode } from "react";

// 登录/注册页不参与搜索引擎收录
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
