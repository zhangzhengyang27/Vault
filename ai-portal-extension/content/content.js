// AI 提示词助手 - Content Script
// 监听来自 popup 的插入消息，将提示词文本写入当前聚焦的输入框/文本域

(function () {
  // 防止 executeScript 重复注入时注册多个 message listener
  if (window.__aiPortalExtensionInjected) return;
  window.__aiPortalExtensionInjected = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "INSERT_PROMPT" && msg.text) {
      // 异步把真实结果回给 popup：success=已插入输入框；copied=已兜底复制到剪贴板
      insertText(msg.text).then((result) => sendResponse(result));
      return true; // 保持消息通道开启，等待异步 sendResponse
    }
  });

  async function insertText(text) {
    const active = document.activeElement;

    // 处理 contenteditable 元素（如富文本编辑器）
    if (active && active.isContentEditable) {
      active.focus();
      const ok = document.execCommand("insertText", false, text);
      return { success: ok };
    }

    // 处理标准 input / textarea
    if (
      active &&
      (active.tagName === "TEXTAREA" ||
        (active.tagName === "INPUT" &&
          ["text", "search", "url", "email", ""].includes(active.type)))
    ) {
      const el = active;
      // email 等输入类型不支持选区 API（selectionStart/setSelectionRange 会抛
      // InvalidStateError），读取与恢复都用 try/catch 兜底为「追加到末尾」
      let start = el.value.length;
      let end = el.value.length;
      try {
        start = el.selectionStart ?? el.value.length;
        end = el.selectionEnd ?? el.value.length;
      } catch {
        /* 不支持选区：退化为在末尾追加 */
      }
      const newValue = el.value.slice(0, start) + text + el.value.slice(end);

      // 使用原生 setter 触发 React/Vue 等框架的 onChange
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, newValue);
      } else {
        el.value = newValue;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      // 将光标移到插入文本末尾（不支持选区 API 的类型跳过）
      try {
        const newPos = start + text.length;
        el.setSelectionRange(newPos, newPos);
      } catch {
        /* ignore */
      }
      return { success: true };
    }

    // 没有聚焦的输入框，尝试查找页面上的主要输入框
    const textareas = document.querySelectorAll("textarea");
    const inputs = document.querySelectorAll(
      'input[type="text"], input[type="search"], input:not([type])',
    );

    const target =
      textareas[0] ||
      Array.from(inputs).find((i) => i.offsetParent !== null);

    if (target) {
      target.focus();
      await new Promise((r) => setTimeout(r, 50));
      return insertText(text);
    }

    // 兜底：复制到剪贴板并提示
    try {
      await navigator.clipboard.writeText(text);
      showToast("提示词已复制到剪贴板");
    } catch {
      showToast("请手动复制提示词");
    }
    return { success: false, copied: true };
  }

  // 轻量 Toast 提示
  function showToast(message) {
    const existing = document.getElementById("ai-prompt-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "ai-prompt-toast";
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #18181b;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: ai-prompt-fadein 0.2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
})();
