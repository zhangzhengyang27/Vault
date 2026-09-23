---
title: 总览：AI 从业者的数据库版图
summary: 论文、模型、评测、数据集、行业报告五大数据族的地图与选型速查表，帮你把"该去哪个库查什么"变成肌肉记忆。
category: 总览
sort: 1
---

做 AI 相关的工作，一半的时间其实在"找东西"：找一篇论文的出处、找一个模型的最优实现、找一份可信的评测数据、找一个能直接用的数据集、找一个能引用的行业统计。这些需求背后，是五类各有霸主的数据库。这张地图帮你在 30 秒内定位"该去哪、查什么"。

## 五大数据族速查表

| 数据族 | 解决什么问题 | 首选入口 | 补充入口 |
| --- | --- | --- | --- |
| 论文与学术 | 找论文、追前沿、做文献综述 | [arXiv](https://arxiv.org/) | Semantic Scholar、OpenAlex、HF Papers |
| 模型与代码 | 找模型权重、跑模型、调 API | [Hugging Face](https://huggingface.co/) | ModelScope 魔搭、OpenRouter、Ollama |
| 评测与榜单 | 模型到底谁强、值不值这个价 | [LMArena](https://lmarena.ai/) | Artificial Analysis、HELM、MTEB、OpenCompass |
| 数据集与语料 | 找训练/评测数据 | [Hugging Face Datasets](https://huggingface.co/datasets) | Kaggle、Google Dataset Search、Common Crawl 衍生语料 |
| 行业报告与统计 | 引用权威数字、判断行业趋势 | [Stanford AI Index](https://hai.stanford.edu/ai-index) | Epoch AI、AI Incident Database、OECD.AI |

## 三个典型工作流

**工作流一：选一个生产用模型。** 先上 LMArena 看人类偏好榜和你的目标任务子榜（比如编码），再到 Artificial Analysis 核对价格与吞吐，最后去 Hugging Face 或 ModelScope 确认开源版本的许可证，闭源则去 OpenRouter 比价试用。全程约半小时，比只看一家发布会靠谱得多。

**工作流二：追一个研究方向。** 在 arXiv 上按分类订阅（cs.CL / cs.LG / cs.CV），配合 Semantic Scholar 的引用通知跟踪关键论文，需要复现时去 Hugging Face Papers 找社区实现，想确认是不是当前最优再查对应 benchmark 的官方榜单。

**工作流三：找数据做实验。** 先用 Google Dataset Search 和 HF Datasets 按任务/语言/许可证筛选，小规模实验优先 Kaggle（自带社区 Notebook），做严肃实验则直接选带质量信号和去污染说明的开放语料（FineWeb、Dolma 系）。

## 三条使用原则

1. **交叉验证。** 任何单一来源都可能有偏差：榜单会被针对性优化（Open LLM Leaderboard 就因基准污染于 2025 年 3 月归档），论文预印本未经同行评审，厂商自报数据要打问号。重要结论至少两个独立来源。
2. **注意时效。** AI 数据库领域近两年变动剧烈：Papers with Code 在 2025 年 7 月被 Meta 关站，Open LLM Leaderboard 归档，MTEB/HELM 持续改版。本知识库每篇文档都标注了事实核对时间（2026 年 9 月），引用其中数字时请留意。
3. **善用 API。** 这批数据库几乎全部提供免费 API（arXiv、Semantic Scholar、OpenAlex、Hugging Face、OpenRouter 等），把检索编进脚本比手动翻页高效一个量级。

## 本知识库结构

- **论文与学术**：arXiv、Semantic Scholar 与 OpenAlex、Papers with Code 关站始末与替代方案
- **模型与代码**：Hugging Face、ModelScope 魔搭、OpenRouter 与 Ollama
- **评测与榜单**：LMArena、Artificial Analysis、HELM 与 MTEB、OpenCompass 与 SuperCLUE、读榜方法论
- **数据集与语料**：Common Crawl、开放预训练语料全景、数据集发现入口
- **行业报告与统计**：Stanford AI Index、Epoch AI 与其他统计源

每个条目按统一结构展开：是什么、核心能力、怎么用、数据量级、局限与注意事项，并附官网入口。
