# AGENTS.md — ai-portal-extension（Chrome 扩展）

给 AI 编码代理的本工程速览。人类向说明见 [README.md](./README.md)。

## 定位

「AI 提示词助手」Chrome MV3 扩展。**原生 JS、无构建步骤、无 npm 依赖、无包管理器**
——直接改源码，在 `chrome://extensions/` 点「重新加载」即生效。不要引入打包器、
框架或 CDN 脚本（MV3 禁止远程代码）。

## 结构

- `manifest.json` — MV3 声明，权限仅 `storage / activeTab / scripting`
- `popup/` — 弹窗：从 API 拉取已发布提示词、分类浏览、搜索、设置 API 地址
- `content/` — 注入目标页面的 content.js / content.css，接收 `INSERT_PROMPT`
  消息插入文本
- `icons/` — 16 / 48 / 128 图标

## 约定与红线

- **权限最小化**：不要往 manifest 加 `<all_urls>` 或任何额外权限；注入靠
  `activeTab` + 按需 `chrome.scripting.executeScript`。
- 插入文本使用**原生 value setter**（兼容 React/Vue 等受控组件）——不要改成直接
  `el.value = x`。
- API 地址：`popup.js` 顶部 `DEFAULT_API` 常量（默认 `http://localhost:3001/api`）+
  `chrome.storage.sync` 的 `apiBase`（弹窗设置面板可改）。生产值见
  [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) 第 4 节。
- 数据来自后端公开接口 `/api/prompts`（只返回 published）；后端 CORS 已放行
  `chrome-extension://`。
- 扩展更新/重装后，已打开的标签页没有注入 content script，需刷新页面——这是
  activeTab 模型的预期行为，不要试图"修复"它。
