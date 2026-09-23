---
title: OpenRouter 与 Ollama：调用模型的两个入口
summary: 一个钥匙开所有云端模型（OpenRouter），一条命令在本地跑模型（Ollama）。前者按真实用量给出最诚实的模型榜，后者是本地实验的事实标准。
category: 模型与代码
sort: 7
---

选好了模型，接下来的问题是从哪调用。云端与本地各有一个事实标准入口。

## OpenRouter：一把钥匙开所有模型

[OpenRouter](https://openrouter.ai/) 聚合数百个模型（OpenAI、Anthropic、Google、Meta 开源系列、DeepSeek、Qwen 等），提供统一的 OpenAI 兼容 API：

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{"model": "deepseek/deepseek-chat", "messages": [...]}'
```

**核心价值：**
- **不用逐家注册**：一个 key、一份余额，按 token 计费调用所有主流模型。
- **供应商路由与降级**：同一模型背后常有多个推理供应商，OpenRouter 可按价格/延迟自动选择，某家故障自动切换。
- **价格透明**：模型页实时对比各供应商单价，常见模型比官方直连便宜（走批发价）。
- **[真实用量榜单](https://openrouter.ai/rankings)**：按全平台实际 token 消耗量给模型排名——反映的是"开发者真金白银投的票"，与评测榜对照看非常有信息量（营销做得了榜单，做不了用量）。

**注意**：经过中间商意味着请求会经手第三方，敏感数据场景要评估；另外其统计的用量榜覆盖的是开发者 API 调用，不等于 C 端产品热度。

## Ollama：本地跑模型的事实标准

[Ollama](https://ollama.com/) 把"下载权重、量化、加载推理"压缩成一条命令：

```bash
ollama run qwen2.5:7b        # 下载并进入对话
ollama pull hf.co/Qwen/Qwen2.5-7B-Instruct-GGUF   # 直接拉取 HF 上的 GGUF 量化版
```

**核心能力：**
- **模型库**：官方 library 收录主流开源模型的量化版本；通过 `hf.co/<org>/<repo>` 语法可直接拉取 Hugging Face 上的 GGUF 文件，与 HF 生态打通。
- **OpenAI 兼容 API**：本地起一个 `localhost:11434` 服务，应用代码几乎不用改就能从云端切到本地。
- **Modelfile**：类似 Dockerfile 的方式定制系统提示词、参数与量化，方便团队分发统一配置。

**选型经验**：消费级显卡的显存大约能装下"参数量 × 1GB"的 Q4 量化模型——16GB 显存跑 14B 以下较从容，7B 是笔记本的甜点档。追求质量上更大模型或量化更低的版本，追求速度反之。

## 典型组合

```
本地试验（Ollama，零成本、隐私安全）
    ↓ 验证 prompt 与效果
小规模生产（OpenRouter，免开户、可换模型 A/B）
    ↓ 用量稳定后
直连官方 API 或自托管 vLLM（更低成本、更高可控性）
```

这个"本地 → 聚合 → 直连"的路径能兼顾迭代速度与成本，也是个人开发者与创业团队最常见的演进路线。
