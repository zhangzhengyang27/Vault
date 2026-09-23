---
title: 动手写第一个 MCP Server（Python）
summary: 用官方 Python SDK + FastMCP 在 30 分钟内写出可用的本地 Server：三个工具、一个资源、接入 Claude Desktop 的全流程。
category: 开发实战
sort: 243
---

概念都齐了，这一篇真刀真枪写一个 stdio 形态的 MCP Server：一个"团队知识库速查"工具集——搜索内部文档、查值班表、读产品名词表。全程约 30 分钟。

## 环境准备

Python 3.10+，用官方 Python SDK（包名 `mcp`，底层含 FastMCP 快速开发框架）：

```bash
uv init mcp-demo && cd mcp-demo
uv add "mcp[cli]"
```

## 最小可用的 Server

新建 `server.py`：

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("team-kb")

@mcp.tool()
def search_docs(keyword: str) -> str:
    """按关键词搜索团队文档，返回最相关的 5 条（标题+摘要+路径）。

    适合模糊查找，如"报销""发布流程"；已知文档路径请用 read_doc。
    """
    hits = my_kb_index.search(keyword, top_k=5)  # 接你的检索实现
    if not hits:
        return "未找到相关文档，可尝试更换关键词。"
    return "\n".join(f"[{h.title}] {h.summary} ({h.path})" for h in hits)

@mcp.tool()
def get_oncall(date: str) -> str:
    """查询某天的值班人。date 格式 YYYY-MM-DD。"""
    ...
```

逐点对照前面学过的设计原则：

- 工具描述写了**何时用、不该何时用**（search vs read 的分流）；
- 参数说明带**格式示例**（YYYY-MM-DD）；
- 空结果返回**可执行的指引**而不是空列表——这些细节都直接影响模型调用准确率（第 3 篇）。

## 再加一个 Resource 和一个 Prompt

```python
@mcp.resource("kb://glossary")
def glossary() -> str:
    """产品名词表（用户可浏览选取）"""
    return open("glossary.md").read()

@mcp.prompt()
def triage(issue_text: str) -> str:
    """按团队模板对问题单做分级"""
    return f"请按以下框架分析该问题的严重程度：影响面/可绕过/有无替代方案…\n问题：{issue_text}"
```

FastMCP 用装饰器把普通函数变成协议原语——类型注解自动生成 JSON Schema，docstring 自动成为工具描述。**写工具的功夫，本质上还是第 3 篇讲的设计功夫。**

## 调试：先过 Inspector 再接 Host

```bash
uv run mcp dev server.py     # 打开 MCP Inspector（第 8 篇的主角）
```

在 Inspector 里验证：工具列表正确、每个工具试调用一次、错误分支的返回信息像"给模型的指引"。这一步过了再接 Host，能省掉一半排查时间。

## 接入 Claude Desktop / Cursor

Claude Desktop 配置文件（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "team-kb": {
      "command": "uv",
      "args": ["--directory", "/绝对路径/mcp-demo", "run", "server.py"]
    }
  }
}
```

重启 Host，工具图标里出现 team-kb 即成功。测试用**真实场景的模糊问句**："下周五谁值班？""报销流程在哪份文档里？"——看模型是否选对工具、填对参数。

## 常见首跑问题

- **路径必须是绝对路径**，相对路径在 Host 启动的子进程里解析不对；
- **python/uv 环境不对**：Host 用 PATH 里的解释器启动你的命令，用绝对路径或 `uv run` 锁定环境；
- **stdout 污染**：stdio 模式下代码里任何 `print` 都会破坏协议流，日志必须走 stderr（SDK 的 logging 已处理）。

## 下一步

你的第一个 Server 已经"装进"AI 应用了。第 7 篇系统讲各端接入方式，第 8 篇讲出问题怎么查。TypeScript 开发者可对照官方 SDK 文档，思路完全一致。
