/** 站点公开地址：sitemap / robots / RSS / OpenGraph 统一来源。
 *  生产环境通过 NEXT_PUBLIC_SITE_URL 配置；缺省回退 localhost 供本地开发。 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
