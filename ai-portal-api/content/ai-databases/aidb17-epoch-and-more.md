---
title: Epoch AI 与其他高价值统计源
summary: 查单个模型的参数与训练算力去 Epoch AI，查 AI 事故去 AI Incident Database，查政策去 OECD.AI，查 NLP 论文去 ACL Anthology。四个互补的权威数据源。
category: 行业报告与统计
sort: 17
---

AI Index（见上一篇）提供年度全景，但日常工作中常需要更细粒度的数据：某个模型用了多少算力？某起 AI 事故的来龙去脉？某个国家出了什么新规？这篇收录四个互补的权威统计源。

## Epoch AI：前沿模型的"户口本"

[Epoch AI](https://epoch.ai/) 专注于 AI 发展的定量研究，维护着业内最常被引用的几个数据库：

- **前沿模型数据库**：逐个记录重要模型的参数量、训练算力、数据规模、发布方与日期，论文与媒体常直接引用其图表；
- **算力趋势**：训练算力随时间的增长曲线、硬件性能/价格趋势——"scaling 是否还在继续"的定量答案在这里；
- **数据墙研究**：对"高质量公开数据何时耗尽"的测算，是合成数据讨论的数据基础。

**用法**：需要任何"模型级"硬数据（GPT-4 用了多少 FLOP？训练成本怎么涨？）先查 Epoch。注意其部分数据为估算（基于论文与泄漏信息推断），图表下方标注了估算方法。

## AI Incident Database：AI 事故档案库

[AI Incident Database](https://incidentdatabase.ai/)（AIID，由 Responsible AI Collaborative 维护）系统收录现实世界发生的 AI 负面事件：算法歧视、聊天机器人有害输出、自动驾驶事故、深度伪造滥用……每条记录附来源链接与分类标签。

**用法**：做 AI 风险评估、合规材料、安全培训案例时的第一来源。Stanford AI Index 报告中的"AI 事件"统计正是基于 AIID。中国用户可配合国内的算法备案与生成式 AI 管理规定做对照分析。

## OECD.AI：全球政策观察站

[OECD.AI](https://oecd.ai/) 由经合组织运营，聚合各国 AI 政策与监管动态：

- **政策库**：各国 AI 战略、法规、监管沙盒的可检索数据库，含实时更新；
- **AI 事件/趋势看板**：与 AIID 等数据源联动的可视化；
- **权威框架**：OECD AI 原则体系是多国监管（含欧盟 AI Act 讨论）的参照基线。

**用法**：产品要出海或做合规调研时，先在这里确认目标市场正在发生什么。国内政策另需跟踪网信办等官方渠道。

## ACL Anthology：NLP 论文官方档案

[ACL Anthology](https://aclanthology.org/) 收录 ACL、EMNLP、NAACL、COLING 等 NLP 会议与期刊的全部论文，从 1960 年代至今，免费全文。相比 arXiv：

- 只有**通过同行评审**的正式发表版本；
- 稳定的规范引用格式（bib 条目直接导出）；
- 带会议/年份/奖项（best paper）检索维度。

**用法**：写论文、做文献综述时，用 Anthology 引用正式版而非 arXiv 预印本；追 NLP 领域历届 best paper 是快速理解领域脉络的捷径。

## 组合用法示例

写一份"大模型行业分析报告"时：宏观格局用 **AI Index**，模型级技术数据用 **Epoch AI**，风险章节用 **AIID** 案例填充，政策环境用 **OECD.AI**，技术文献综述用 **ACL Anthology + Semantic Scholar**。五个来源交叉引用，报告的数据底座就立住了。
