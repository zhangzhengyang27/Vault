---
title: MCP 是什么：为 AI 接上"USB-C"
summary: 一篇讲清 Model Context Protocol 的定位：它解决 M×N 集成地狱、由谁主导、和 Function Calling 的关系，以及 2026 年的生态现状。
category: 协议基础
sort: 240
---

大模型本身只会生成文字。要让它"办事实"——查数据库、操作浏览器、读写文件——就得有人给它接上工具。在 MCP 出现之前，这件事是**每个应用 × 每个工具各写一遍**的定制开发。MCP（Model Context Protocol，模型上下文协议）要终结的就是这种集成地狱。

## M×N 地狱与 USB-C 类比

MCP 官方的经典类比：AI 应用连接外部工具，就像设备连接外设。USB-C 出现之前，每个设备每个外设一种接口；USB-C 之后，一根线走天下。

- 协议之前：M 个 AI 应用（Claude、Cursor、自研助手）× N 个工具（GitHub、数据库、浏览器）= M×N 份定制集成。
- 协议之后：工具方按 MCP 实现一次 Server，应用方实现一次 Client，双方即插即用。

## 三个基本事实

1. **由 Anthropic 于 2024 年 11 月开源**，随后 OpenAI、Google 等主要厂商相继宣布支持，2025-2026 年成为事实上的行业标准和开放规范。协议规范与文档在 [modelcontextprotocol.io](https://modelcontextprotocol.io)，SDK 覆盖 Python、TypeScript、Java、C# 等。
2. **它不是模型能力，是应用层协议**。模型自己"不知道"MCP——是宿主应用（如 Claude Desktop、Cursor）充当 MCP 客户端，把服务器的工具翻译成模型能理解的工具描述。
3. **它和 Function Calling 是互补关系**。Function Calling 是模型决定"何时调用什么"的机制；MCP 是"工具如何被发现、描述、调用"的标准化管道。模型负责选，MCP 负责接。

## 一图看懂角色

```
[模型] ←→ [MCP Host 应用(内含 MCP Client)] ←→ [各种 MCP Server] → [GitHub/数据库/浏览器/你的内部系统]
```

- **Host**：AI 应用本体（Claude Desktop、Cursor、你的产品）
- **Client**：Host 内部与某个 Server 保持 1:1 连接的组件
- **Server**：暴露工具/资源/提示模板的独立进程，可以是你写的，也可以是社区现成的

## 2026 年的生态现状

- **官方维护的服务器**覆盖主流平台（GitHub、Google Drive、Slack、Postgres、Puppeteer 等）；社区生态里数千个 Server 可直接安装。
- **客户端支持**已成为 AI 编程工具和桌面助手的标配能力。
- **企业采用**的主要顾虑集中在鉴权与安全（第 9 篇专讲）——这也是协议近两年演进的中心议题（OAuth 支持、远程服务器传输规范等）。

## 这个协议与你有什么关系

- **普通用户**：安装现成的 MCP Server，给本地 AI 助手"装手脚"——第 7 篇讲接入。
- **开发者**：把团队内部系统做成 MCP Server，一次开发，所有支持 MCP 的 AI 应用都能用——第 6 篇动手写。
- **产品决策者**：判断"要不要 MCP 化"的方法论——第 11 篇生态地图与选型判断。

本站还收录了完整的 MCP 服务器目录，学完本库即可按图索骥。下一篇：协议的核心概念——三种角色与三类原语。
