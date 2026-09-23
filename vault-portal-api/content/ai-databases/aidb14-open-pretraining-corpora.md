---
title: 开放预训练语料全景：FineWeb、Dolma、RedPajama 与后来者
summary: 从 FineWeb 的 15T 到 RedPajama-V2 的 30T，再到主打"许可安全"的 Common Pile。一表看懂开放预训练语料的世代之争，以及怎么按需求选料。
category: 数据集与语料
sort: 14
---

预训练语料是大模型的"食谱"。2023 年之前，开源世界只有 The Pile、C4 这类静态小集合；如今已演进到"万亿 token 级 + 质量信号 + 许可安全"的第三世代。全部托管在 Hugging Face Datasets，可免费下载。

## 三代演进

**第一代（2020–2022）：静态混合集。** The Pile（825GB，已因版权争议下架）、C4（Google 清洗的 Common Crawl 子集）、中文侧的 WuDao 系。作用是定义了"混合来源"的配方思路。

**第二代（2023–2024）：规模 + 质量信号。** RedPajama-V2 从 84 次 Common Crawl 快照构建了 100T+ 原始 token、30T 过滤 token，并附质量分类信号；Hugging Face 的 FineWeb（15T）凭更优的清洗配方在同等训练量下超过前代语料，其教育质量子集 FineWeb-Edu（1.3T）证明"少而精"可以更强；Ai2 的 Dolma（3T）配套 OLMo 全开源，训练数据配方全程可审计。

**第三代（2025–）：四个新方向。**
- **多语言**：FineWeb2 覆盖 1,000+ 语言（约 5B 文档），为非英语模型供料；
- **质量上采样**：Dolma 3（约 6T，配 OLMo 3）按质量分层重采样，并把数据去污染做进配方；
- **大厂入场**：NVIDIA 的 Nemotron-CC（6.3T 英文 token，重去重）；
- **许可安全**：EleutherAI 的 Common Pile（约 8TB，全部开放许可来源）、Pleias 的 Common Corpus（约 2T，无版权/宽松许可），直接回应 Common Crawl 的版权争议。

## 选型速查表

| 语料 | 机构 | 规模（约） | 特点 | 适合 |
| --- | --- | --- | --- | --- |
| FineWeb / FineWeb-Edu | Hugging Face | 15T / 1.3T | 清洗配方强，Edu 子集性价比高 | 通用训练、复现实验 |
| FineWeb2 | Hugging Face | 千语种 | 多语言扩展 | 中文/多语言实验起点 |
| RedPajama-V2 | Together AI | 30T（过滤）/100T（原始） | 附质量信号，可自选过滤阈值 | 需要自定义清洗的研究 |
| Dolma 3 | Ai2 | 6T | 与 OLMo 3 全开源配套、去污染 | 复现开源模型训练 |
| Nemotron-CC | NVIDIA | 6.3T | 英文、重去重、工业管线 | 大规模英文预训练 |
| Common Pile | EleutherAI | 8TB | 全部开放许可 | 商用合规优先 |
| Common Corpus | Pleias | 2T | 许可安全 + 多语言（含法/中比重高） | 合规商用、欧洲多语言 |
| DCLM | DataComp-LM 社区 | 数 T | 以"数据竞赛"方式持续优化 | 跟进数据配方前沿 |

## 怎么选

1. **做研究/复现**：Dolma 3（配套模型、配方全开源）或 FineWeb-Edu（小而精，算力友好）。
2. **商用产品**：优先 Common Pile / Common Corpus 这类许可可追溯的语料；用 FineWeb 系要有自己的版权风险评估（上游是 Common Crawl）。
3. **中文为主**：FineWeb2 的中文部分做起点，结合魔搭/智源的中文语料与自建数据；纯英文语料对中文能力帮助有限。
4. **只想学数据工程**：RedPajama-V2 的质量信号 + 自己写过滤管线，是最好的练习题。

## 趋势观察

- **数据墙（data wall）**：Epoch AI 等机构测算，高质量公开网络文本将在数年内被"用尽"，合成数据与许可采购成为下一站；
- **去污染标配化**：评测集泄露检查（如针对 MMLU/GSM8K 的 n-gram 过滤）已从可选项变为标配；
- **配方比规模重要**：第二代到第三代的共同教训——同样 token 数，清洗与配比带来的差距可达数个基准点。
