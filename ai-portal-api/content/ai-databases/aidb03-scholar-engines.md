---
title: Semantic Scholar 与 OpenAlex：两大开放学术检索引擎
summary: 一个提供 AI 增强的论文理解（TLDR、引用上下文），一个提供完全开放的科研大数据。覆盖 2 亿+ 篇文献的免费 API，是做文献分析的首选底座。
category: 论文与学术
sort: 3
---

Google Scholar 固然好用，但它没有官方 API、反爬严格，做不了批量分析。当你需要"用程序处理学术数据"或"深挖一篇论文的引用网络"时，两个开放引擎是更好的选择。

## Semantic Scholar：读懂论文的 AI 引擎

[Semantic Scholar](https://www.semanticscholar.org/) 由艾伦人工智能研究所（AI2）运营，索引学术论文超过 2 亿篇，覆盖所有学科。

**核心能力：**
- **TLDR 摘要**：用一句话极简概括论文核心贡献，快速判断"这篇值不值得读"。
- **引用上下文**：不只给引用列表，还告诉你"引用它的那句话说了什么"，判断正面引用还是反面引用。
- **影响力指标**：除引用数外提供 Relative Citation Ratio 等校正后的指标。
- **S2ORC**：全量解析版语料（含全文、引用结构），是学术 NLP 研究的标准数据集。

**API 实操**：`api.semanticscholar.org/graph/v1/paper/search?query=rag&fields=title,year,citationCount` 返回 JSON，免费注册即可获得较高限额（匿名调用限速较低）。支持按论文、作者、机构检索，也有批量端点。适合：文献综述辅助、研究趋势统计、构建个人论文知识库。

## OpenAlex：完全开放的科研大数据

[OpenAlex](https://openalex.org/) 是微软学术图谱（MAG）2021 年停止服务后的继任者，由荷兰非营利组织 OurResearch 维护，收录学术作品约 2.5 亿条。

**核心能力：**
- **五类实体**：作品（Works）、作者（Authors）、机构（Institutions）、概念/主题（Concepts/Topics）、出版源（Sources），之间全部互联，可以回答"某机构 2025 年发了多少篇 RAG 相关论文"这类复杂问题。
- **CC0 许可**：数据完全开放，可以整库下载自建服务，商用无顾虑。
- **API 免费且慷慨**：每日 10 万次调用（带邮箱 polite pool 更稳定），支持 `filter=` 组合过滤与 `group_by` 聚合统计。

**适合场景**：科研计量分析、机构/国家维度统计、给自建应用挂学术检索、长期数据存档。AI Index 等权威报告的论文统计也大量依赖这类开放图谱。

## 三者怎么选

| 需求 | 推荐 |
| --- | --- |
| 人工快速查一篇论文 | Google Scholar 覆盖最全 |
| 批量拉数据、写脚本 | OpenAlex（配额宽松、CC0） |
| 看论文语义摘要与引用语境 | Semantic Scholar |
| 全文学术 NLP 研究 | S2ORC / Semantic Scholar |
| 引用计数等计量分析 | 两者交叉验证 |

## 注意事项

1. **覆盖有偏差**：两者对 CS/AI 会议论文的收录较全，但都存在元数据错误（作者消歧是最著名的坑），关键数字要抽查。
2. **开放图谱之间数字不一致是常态**：arXiv、S2、OpenAlex 对"2025 年 AI 论文数"会给出不同答案，因为去重与分类口径不同。引用时注明来源与口径。
3. **国内访问**：两个 API 均可直连，速度尚可；Semantic Scholar 网页端偶尔不稳定，API 不受影响。
