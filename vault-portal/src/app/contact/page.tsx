import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "联系方式",
  description: "联系 AI 导航团队：内容纠错、合作与建议。",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
        联系方式
      </h1>
      <div className="space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <p>
          站点内容纠错、合作与建议，欢迎通过以下站内渠道联系我们，管理员会定期查看处理：
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            在
            <Link
              href="/community"
              className="mx-1 text-blue-600 underline dark:text-blue-400"
            >
              社区
            </Link>
            发帖反馈，其他用户也能参与讨论；
          </li>
          <li>
            通过
            <Link
              href="/submit"
              className="mx-1 text-blue-600 underline dark:text-blue-400"
            >
              提交内容
            </Link>
            入口推荐新工具、提示词或 MCP，审核通过后会站内展示；
          </li>
          <li>注册登录后在个人中心私信管理员。</li>
        </ul>
      </div>
    </div>
  );
}
