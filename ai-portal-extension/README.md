## 注意事项

- 权限最小化：manifest（MV3）只声明 `storage/activeTab/scripting`，
  通过 `activeTab` + 按需 `chrome.scripting.executeScript` 在当前页面注入，
  **不需要** `<all_urls>` 主机权限
- 扩展更新/重装前已打开的标签页没有注入内容脚本，刷新页面即可使用
- 插入逻辑使用原生 value setter，兼容 React/Vue 等框架的受控组件
