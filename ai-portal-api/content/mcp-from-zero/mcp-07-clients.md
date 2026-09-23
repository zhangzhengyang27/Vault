---
title: 客户端接入：Claude、Cursor 与自研应用
summary: 把 MCP Server 接进各类宿主：桌面/编程工具的配置模式、企业远程 Server 的接入要点、自研产品的 SDK 集成路线。
category: 开发实战
sort: 243
---

Server 写好了，谁来用它？这一篇按"你是谁"分三条路线：个人用户接现成 Host、企业团队接远程 Server、开发者把 MCP 集成进自己的产品。

## 路线一：接进桌面与编程工具

主流支持 MCP 的 Host（Claude Desktop、Cursor、VS Code 系、Cline 等）的配置模式高度一致——一个 JSON 清单，每条描述"怎么启动/连接一个 Server"：

```json
{
  "mcpServers": {
    "github":   { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"],
                  "env": { "GITHUB_TOKEN": "ghp_xxx" } },
    "team-kb":  { "command": "uv", "args": ["--directory", "/opt/team-kb", "run", "server.py"] },
    "company":  { "url": "https://mcp.internal.corp/mcp" }
  }
}
```

三条经验：

1. **命名即认知**：Server 名字会出现在模型看到的工具前缀里，起得清楚有助于模型选对工具。
2. **环境变量放密钥**：token 走 `env` 字段，别写进代码；本机配置文件本身要当敏感物对待。
3. **逐个开启排查**：装一堆 Server 出问题时，一次只开一个定位冲突；不用的及时关——每个 Server 的工具都会占模型上下文。

第 6 篇末尾的 Claude Desktop 配置就是这个模式的最小实例。

## 路线二：企业接入远程 Server

团队部署的 HTTP Server（第 5 篇形态二）接入时，重点从"配置"变成"管控"：

- **统一分发**：把 Server 清单做成团队模板（或用支持集中管理策略的 Host），避免每个人各装各的、密钥满天飞；
- **OAuth 而非散 token**：远程 Server 走标准 OAuth 授权，用户不接触裸密钥，可吊销、可审计；
- **最小授权清单**：企业 Host 建议默认关高危工具（删除/外发类），白名单放行；
- **审计对齐**：Host 侧与 Server 侧日志按用户会话关联，出事能回溯（第 9 篇的审计主题）。

## 路线三：把 MCP 集成进自研产品

你要做的是 Host——自己产品里的 MCP Client。官方 SDK 覆盖 Python / TypeScript / Java / C#，集成骨架：

1. **会话管理**：为每个用户会话维护其启用的 Server 连接（连接、握手、能力发现）；
2. **工具注入**：把所有 Server 的工具描述合并，转成你模型的 function 定义（模型侧 Function Calling）；
3. **执行回环**：模型决定调用 → 权限校验 → 路由到对应 Client → 执行 → 结果回填对话；
4. **人机确认层**：写操作、外发操作、资金相关操作前插入用户确认 UI——这一层是你的产品安全底线，协议不管，你必须管。

选型提示：不要自己实现协议细节（传输、握手、重连），全交 SDK；你的工程精力应该花在**工具注入的上下文管理、权限模型、确认交互**这三件 SDK 不替你决定的事上。

## 常见接入问题速查

| 症状 | 大概率原因 |
| --- | --- |
| Host 里看不到 Server 的工具 | 配置 JSON 语法/路径错误；Server 启动即崩（先看 Host 的 MCP 日志） |
| 工具看得到但从不被调用 | 工具描述太弱（第 3 篇）；或与另一个工具职责重叠 |
| 调用报连接错误 | stdio：解释器环境不对；HTTP：鉴权过期、网络策略 |
| 回答"无法访问该数据" | Server 返回了错误信息被模型如实转述——按第 8 篇查 Server 日志 |

接入只是把管子接上，管子里流的水对不对，靠下一篇的调试与观测。
