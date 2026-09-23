import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们",
  description:
    "AI 导航是一座聚合 AI 工具、提示词、知识库、资讯与社区的一站式中文门户。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <h1 className="text-[28px] font-semibold leading-9 text-zinc-900 dark:text-zinc-50">
        关于我们
      </h1>
      <div className="space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <p>
          AI
          导航是一座一站式中文 AI
          门户，聚合 AI 工具、提示词、知识库、资讯、MCP/Skills 与社区内容，
          帮助不同人群找得到、学得会、用得上 AI。
        </p>
        <p>
          内容以「AI 自动采集 + 人工审核」为核心生产方式：采集管线持续抓取全网新工具与新资讯，
          编辑在后台审核、修订后发布，社区投稿与用户提交同样经过审核流程，保证收录质量。
        </p>
        <p>
          平台内容持续建设中。如果你发现内容有误或想推荐新工具，欢迎通过页脚的「提交内容」入口告诉我们。
        </p>
      </div>
    </div>
  );
}
