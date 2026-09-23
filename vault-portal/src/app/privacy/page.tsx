import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "AI 导航对用户数据的收集与使用说明。",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
        隐私政策
      </h1>
      <div className="space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          我们收集哪些信息
        </h2>
        <p>
          注册时需要提供用户名与邮箱；登录态通过 HttpOnly Cookie
          维持，令牌不会暴露在页面脚本中。发布内容（帖子、评论、投稿）会随账号昵称公开展示。
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          数据如何使用
        </h2>
        <p>
          数据仅用于账号鉴权、内容展示与站点基础统计（限流、在线用户数），不会出售或提供给第三方。
          上传的图片等文件仅用于你发布的内容本身。
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          你的控制权
        </h2>
        <p>
          你可以随时在个人中心修改资料；如需删除账号或内容，可通过社区发帖或提交入口联系管理员处理。
        </p>
      </div>
    </div>
  );
}
