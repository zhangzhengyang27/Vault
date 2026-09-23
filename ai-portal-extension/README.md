# ai-portal-extension — AI 提示词助手（Chrome 扩展）

AI 导航 Vault 的浏览器扩展（[仓库总览](../README.md)）：Chrome MV3、原生 JS、
无构建步骤。从 AI 门户 API 拉取已发布提示词，一键插入任意网页的输入框，
支持分类浏览与搜索。

## 功能

- 弹窗内分类浏览 / 搜索已发布提示词（默认拉取 100 条）
- 点击插入：按需向当前标签页注入 `content.js`，发送 `INSERT_PROMPT` 消息插入文本
- 设置面板可自定义 API 地址，经 `chrome.storage.sync` 持久化

## 安装（开发）

Chrome → `chrome://extensions/` → 开发者模式 → 「加载已解压的扩展程序」→
选择本目录。改完代码在扩展卡片上点「重新加载」即生效。

## 目录结构

```
manifest.json    # MV3 声明：权限仅 storage / activeTab / scripting
popup/           # 弹窗 UI 与逻辑（popup.html / popup.js）
content/         # 注入页面的脚本与样式（content.js / content.css）
icons/           # 16 / 48 / 128 图标
```

## 权限说明（与 manifest 对齐）

- 权限最小化：只声明 `storage / activeTab / scripting`，通过 `activeTab` +
  按需 `chrome.scripting.executeScript` 在当前页面注入，**不需要** `<all_urls>`
  主机权限
- 扩展更新/重装前已打开的标签页没有注入内容脚本，刷新页面即可使用
- 插入逻辑使用原生 value setter，兼容 React/Vue 等框架的受控组件

## API 地址配置

- 默认值是 `popup.js` 顶部的 `DEFAULT_API` 常量（当前为 `http://localhost:3001/api`），
  可在弹窗设置面板中修改并保存（`chrome.storage.sync`）
- 生产环境指向 `https://vault.zhangzhengyang.com/api`（更换域名时需同步修改，
  见 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) 第 4 节）
- 数据来自后端公开接口 `/api/prompts`（只返回 `published`）；后端 CORS 已默认
  放行 `chrome-extension://`
