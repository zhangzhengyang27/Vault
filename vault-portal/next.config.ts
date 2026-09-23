import type { NextConfig } from "next";

// 允许的 dev 来源：localhost + 可通过环境变量追加局域网 IP（逗号分隔）
// 示例：DEV_ORIGINS=192.168.1.5,192.168.1.10 pnpm dev
const extraDevOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// 基础安全响应头（CSP 需配合 nonce/内联脚本改造，暂不启用，作为后续纵深防御项）
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 允许用 NEXT_DIST_DIR 把构建产物输出到隔离目录（CI 验证构建时不干扰运行中的 dev server）
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // 不对外暴露 X-Powered-By: Next.js
  poweredByHeader: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraDevOrigins],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3001"}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3001"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
