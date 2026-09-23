---
title: 十分钟起步：Ollama 跑通第一个模型
summary: 从安装到接入应用的完整小流程：安装与拉模型、参数调整、OpenAI 兼容接口、Modelfile 定制，以及四个常见坑。
category: 部署与服务
sort: 303
---

这一篇的目标：十分钟内在你自己的电脑上跑起一个开源模型，并能用 API 调用。以 Ollama 为载体（第 4 篇的阶段一工具），全程不需要任何工程环境。

## 安装与启动

1. **安装**：官网（ollama.com）下载对应系统版本，一路下一步。验证：终端 `ollama --version`。
2. **拉模型**：`ollama pull qwen3:8b`（拉取 Qwen 8B 的量化版，约 5 GB，按你的显存选尺寸——对照第 2 篇的表）。
3. **对话**：`ollama run qwen3:8b`——已经可以聊了。`/bye` 退出。

就这么多。模型文件统一放在 Ollama 的模型目录，多模型共存，`ollama list` 查看。

## 选尺寸的小技巧

Ollama 的模型 tag 带参数量与量化标记（`:8b` 默认 4bit 量化）。选择口诀：**显存(GB) ≈ 参数量(B) 的一半，留 20% 余量**——8G 显存选 7-8B，16G 选 14B，24G 选 32B。同一模型先跑小杯，觉得"不够聪明"再升，比直接拉大杯快得多。

## 常用参数调整

对话中 `/set parameter` 或 API 参数控制行为：

- `temperature`（0-1+）：创造性，事实问答调低（0.1-0.3），写作调高；
- `num_ctx`：上下文长度，默认偏小（4k 左右），处理长文档要显式调大（注意显存随之上涨）；
- `num_predict`：最大输出长度。

## 接入你的应用：OpenAI 兼容 API

Ollama 内置 OpenAI 兼容接口（`http://localhost:11434/v1`），任何支持"自定义 OpenAI 端点"的应用都能直连：

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
resp = client.chat.completions.create(
    model="qwen3:8b",
    messages=[{"role": "user", "content": "用一句话解释 RAG"}],
)
print(resp.choices[0].message.content)
```

这一层的意义：**应用代码与云 API 完全同构**——第 1 篇"混合路线"的技术基础就是它。本站收录的众多桌面 AI 工具也都可以把端点指到本地 Ollama。

## 进阶：Modelfile 定制

想把"系统提示词 + 默认参数"固化成一个专属模型：

```
FROM qwen3:8b
SYSTEM """你是公司 IT 助手，只用中文回答，回答不超过 200 字。"""
PARAMETER temperature 0.2
```

`ollama create it-helper -f Modelfile` 后就有了一个 `it-helper` 模型——简单的角色定制不用微调，一个 Modelfile 就够（真正的微调见第 9-10 篇）。

## 四个常见坑

1. **显存不足 silently 慢**：模型装下了但 KV 缓存不够，表现为"极慢"——调小 `num_ctx` 或换小模型；
2. **num_ctx 默认值太小**：长文档任务被静默截断，模型"看不到后半篇"——长文任务必调；
3. **Mac 用户**：确认 Ollama 用的是统一内存与 Metal 加速（默认已开启），笔记本注意内存压力；
4. **把 Ollama 当生产服务**：它默认无鉴权、并发弱——内网小范围用可以，对外服务按第 6 篇上 vLLM 并加网关。

## 验收清单

- [ ] `ollama run` 对话正常，速度可接受（CPU 也可用但慢）
- [ ] API 调用通，流式输出正常
- [ ] 长上下文任务显式调大 num_ctx
- [ ] 用你的 10 个真实任务测过，质量达标（否则按第 3 篇换模型或升级尺寸）

下一篇：从桌面走向生产——vLLM 部署与真正的并发服务。
