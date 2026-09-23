---
title: Resources 与 Prompts：数据和模板的正确用法
summary: 另外两类原语的分工：Resources 适合什么（以及为什么它不该当工具用）、Prompts 怎么把领域经验产品化。
category: 开发实战
sort: 243
---

Tools 之外，MCP 还有两个常被误用的原语。这一篇讲清分工：什么时候用 Resources、什么时候用 Prompts、什么时候坚持用 Tools。

## Resources：给应用"挂资料库"

Resource 是 Server 暴露给应用读取的数据：文件内容、数据库记录、日志、配置。两个关键特征：

1. **由应用/用户触发读取，不是模型自主检索**。模型说"我需要看日志"不会自动发生——是用户在界面上选择某个资源，或应用按策略附加到上下文。
2. **用 URI 标识**：`file:///logs/app.log`、`postgres://mydb/orders/schema`，支持静态声明（初始化时列出）和模板形式（`file:///logs/{date}.log`）。

**适用**：想让用户"浏览并选取"的数据——项目文件列表、报表集合、配置项。
**不适用**：需要模型按问题自主检索的海量知识库——那是检索工具（内部实现 RAG）的活，不是把一万条记录做成 Resources 让应用全量塞进上下文。Resources 的容量心智是"单个可读文档"，不是"搜索引擎"。

一个实用的组合：Resources 暴露"数据目录"（让用户看到有什么可查），Tools 提供"查询动作"（`search_orders(query)`）——浏览靠资源，检索靠工具。

## Prompts：把领域经验做成模板

Prompt 原语是 Server 预定义的提示模板，用户在界面上主动选择（通常呈现为斜杠命令或菜单项）。它接收参数、渲染成完整的提示词交给模型。

```
/review  →  "请审查以下代码变更，重点关注：并发安全、错误处理、
             命名一致性…（以下是你团队三个月积累的评审清单）
             代码：{code}"
```

价值在于**把"会的人脑子里的流程"固化为所有人可复用的技能**：

- 团队的代码评审 checklist、事故复盘框架、周报格式——每个都是一条 Prompt；
- 与 Tools 组合：模板里可以引导模型"先调用 X 工具获取数据，再按以下框架分析"——Prompt 编排工具，形成半自动工作流；
- 版本化演进：模板改一处，全团队受益，比"口口相传的好提示词"可靠。

**与 Tools 的分工**：Tools 是模型自主调用的动作，Prompts 是用户主动发起的流程。经验法则——"AI 自己会做的"做成 Tool，"人知道何时该做、AI 照章执行"的做成 Prompt。

## 三原语协同的一个完整例子

一个"发布助手" Server：

- **Tools**：`list_unmerged_prs()`、`get_changelog_diff()`、`send_announcement(channel, text)`
- **Resources**：`config://release-checklist`（发布检查清单文档）
- **Prompts**：`/draft-release-notes(version)` ——引导模型先调 `list_unmerged_prs` 和 `get_changelog_diff`，按检查清单（Resource）核对，最后生成公告草稿供人工确认后调用 `send_announcement`。

用户一条命令，模型按既定流程调三件套——这就是 MCP 的"工作流产品化"形态。

## 小结

- Resources：少量、可浏览、用户选读的数据；别拿它当检索引擎。
- Prompts：用户发起、可参数化、可编排工具的技能模板——领域经验的复用单元。
- Tools 依旧是主角，但三者配合才能表达完整的产品逻辑。

下一篇讲底层：Client 与 Server 之间怎么传输——stdio 与 HTTP 的选型。
