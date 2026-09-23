---
title: Papers with Code 关站之后：论文代码与 SOTA 去哪找
summary: 曾经的"论文 + 代码 + SOTA 榜"标杆 Papers with Code 已于 2025 年 7 月被 Meta 关停。本文梳理关站始末、数据存档位置，以及现在的替代工作流。
category: 论文与学术
sort: 4
---

## 关站始末

[Papers with Code](https://paperswithcode.com/)（PWC）2018 年上线，用"论文 ↔ 官方/社区实现 ↔ 排行榜"三向链接的方式，解决了 AI 研究最实际的两个问题：这篇论文有没有能跑的代码？这个任务现在的最高分是多少？2020 年被 Meta 收购时官方承诺"保持中立、开放、免费"，它也确实成了数百万研究者的日常工具。

2025 年 7 月，PWC 在**没有任何预警和官方公告**的情况下开始返回 502 错误，随后确认关停。域名如今跳转到 Hugging Face Trending Papers，运营了 7 年的 SOTA 榜单随之消失。社区普遍猜测与运营成本及商业价值有关，但 Meta 从未给出正式解释。

这件事留下一课：**单一商业公司维护的免费基础设施，说没就没。重要数据必须自己留档。**

## 数据没有丢：两份存档

| 存档 | 位置 | 内容 |
| --- | --- | --- |
| 官方全量数据集 | [paperswithcode-data（GitHub）](https://github.com/paperswithcode/paperswithcode-data) | 全部论文摘要、论文-代码-数据集链接、评测表格、方法信息，JSON dump |
| HF 社区快照 | [pwc-archive（Hugging Face）](https://huggingface.co/pwc-archive) | 关站前最后快照，可直接按数据集加载 |

如果只是查"当年 PWC 上的历史 SOTA 记录"，这两个存档仍然完整可用。

## 现在去哪找：替代工作流

PWC 的三块功能各有接替者，但没有单一站点能同时覆盖。建议按需组合：

**1. 找论文 + 看热度 → [Hugging Face Papers](https://huggingface.co/papers)**
官方指定的"精神续任者"。每日精选 + 趋势榜，论文页直接挂出对应的模型与数据集，形成新的"论文 ↔ 资产"链接。缺点：没有统一的 SOTA 对比表。

**2. 找任务最优结果 → 各基准的官方榜单**
主流基准现在普遍自维护实时榜单，比 PWC 的众包表格更权威：
- 通用能力：LMArena、Artificial Analysis、HELM（见本库"评测与榜单"分类）
- 嵌入检索：[MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
- 代码：SWE-bench Verified、LiveCodeBench 官网
- Hugging Face 也上线了[榜单目录页](https://huggingface.co/docs/leaderboards/en/leaderboards/finding_page)，聚合各类专项榜

**3. 找具体实现 → GitHub 检索 + 生态仓库**
`topic:` 与关键词组合搜索，配合 Papers with Code 数据存档反查仓库地址；NLP 任务优先看 Hugging Face Hub 上带模型卡的实现。

**4. 社区继任项目**
如 [CodeSOTA](https://www.codesota.com/) 等团队在重建 SOTA 榜结构，GitHub 上也有基于官方数据 dump 的复刻项目（如 YA-PapersWithCode）。可关注，但稳定性与更新频率待观察。

## 一份替代检索清单

| 当年 PWC 的用法 | 现在的做法 |
| --- | --- |
| 查论文有没有代码 | HF Papers 论文页 / GitHub 搜索 |
| 查任务 SOTA | 基准官方榜单 / HF 榜单目录 |
| 找流行实现框架 | GitHub topic + HF Hub 模型卡 |
| 查历史评测记录 | paperswithcode-data 存档 |
