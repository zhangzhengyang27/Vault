// AI 提示词助手 - Popup
// 从 AI 门户 API 拉取已发布提示词，支持分类浏览与搜索，
// 点击后按需注入 content.js 并发送 INSERT_PROMPT 消息插入文本。

const DEFAULT_API = "http://localhost:3001/api";
const LIST_LIMIT = 100;

let apiBase = DEFAULT_API;
let prompts = [];
let categories = [];
let activeCat = "all";

const $list = document.getElementById("list");
const $tabs = document.getElementById("tabs");
const $search = document.getElementById("search");
const $settingsPanel = document.getElementById("settings-panel");
const $apiBase = document.getElementById("api-base");

init();

async function init() {
  const stored = await chrome.storage.sync.get({ apiBase: DEFAULT_API });
  apiBase = normalizeBase(stored.apiBase || DEFAULT_API);
  $apiBase.value = apiBase;

  bindEvents();
  await loadData();
}

function normalizeBase(url) {
  const u = (url || "").trim().replace(/\/+$/, "");
  return u || DEFAULT_API;
}

function bindEvents() {
  document.getElementById("open-settings").addEventListener("click", () => {
    $settingsPanel.classList.toggle("hidden");
  });

  document.getElementById("save-settings").addEventListener("click", async () => {
    apiBase = normalizeBase($apiBase.value);
    await chrome.storage.sync.set({ apiBase });
    $settingsPanel.classList.add("hidden");
    await loadData();
  });

  $search.addEventListener("input", renderList);

  $tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    activeCat = btn.dataset.cat;
    $tabs.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t === btn);
    });
    renderList();
  });

  $list.addEventListener("click", async (e) => {
    const item = e.target.closest(".item");
    if (!item || item.dataset.busy) return;
    item.dataset.busy = "1";
    const nameEl = item.querySelector(".name");
    await onPromptClick(item.dataset.slug, nameEl);
    delete item.dataset.busy;
  });
}

async function loadData() {
  $list.innerHTML = '<div class="empty">加载中...</div>';

  try {
    const [catRes, promptRes] = await Promise.all([
      fetch(`${apiBase}/categories`).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${apiBase}/prompts?page=1&limit=${LIST_LIMIT}&sort=uses`
      ).then((r) => {
        if (!r.ok) throw new Error(`prompts ${r.status}`);
        return r.json();
      }),
    ]);

    categories = Array.isArray(catRes) ? catRes.filter((c) => c.parentId == null) : [];
    prompts = Array.isArray(promptRes?.items) ? promptRes.items : [];
    renderTabs();
    renderList();
  } catch (err) {
    $list.innerHTML =
      '<div class="error">无法连接 API，请点击右上角 ⚙ 配置 API 地址</div>';
  }
}

function renderTabs() {
  $tabs.innerHTML = "";
  const all = document.createElement("button");
  all.className = "tab active";
  all.dataset.cat = "all";
  all.textContent = "全部";
  $tabs.appendChild(all);

  for (const c of categories.slice(0, 8)) {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.cat = c.slug;
    btn.textContent = c.name;
    $tabs.appendChild(btn);
  }
}

function renderList() {
  const keyword = ($search.value || "").trim().toLowerCase();

  const filtered = prompts.filter((p) => {
    const catOk =
      activeCat === "all" ||
      p.category?.slug === activeCat ||
      p.category?.name === activeCat;
    if (!catOk) return false;
    if (!keyword) return true;
    const hay = `${p.title ?? ""} ${p.description ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
    return hay.includes(keyword);
  });

  if (filtered.length === 0) {
    $list.innerHTML =
      prompts.length === 0
        ? '<div class="empty">暂无提示词数据</div>'
        : '<div class="empty">没有匹配的提示词</div>';
    return;
  }

  $list.innerHTML = "";
  for (const p of filtered) {
    const div = document.createElement("div");
    div.className = "item";
    div.dataset.slug = p.slug;

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = p.title ?? p.slug;

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = p.description ?? "";

    div.append(name, desc);
    if (p.category?.name) {
      const cat = document.createElement("span");
      cat.className = "cat";
      cat.textContent = p.category.name;
      div.appendChild(cat);
    }
    $list.appendChild(div);
  }
}

/** 确保目标标签页已注入 content.js，然后插入提示词 */
async function insertToActiveTab(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, reason: "no-tab" };
  }

  // 按需注入（activeTab 权限，不需要 <all_urls>）
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/content.js"],
    });
  } catch {
    /* 已注入（防重复注册标记）或受限页面，继续尝试发消息 */
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: "INSERT_PROMPT",
      text,
    });
    return res ?? { success: false };
  } catch {
    return { success: false, reason: "no-content-script" };
  }
}

async function onPromptClick(slug, titleEl) {
  titleEl.textContent = "获取内容...";
  try {
    const res = await fetch(`${apiBase}/prompts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`detail ${res.status}`);
    const detail = await res.json();
    const text = detail?.content ?? "";
    if (!text) {
      titleEl.textContent = "该提示词内容为空";
      return;
    }
    const result = await insertToActiveTab(text);
    if (result?.success) {
      window.close();
    } else if (result?.copied) {
      // 无输入框时 content.js 已兜底复制到剪贴板
      window.close();
    } else {
      titleEl.textContent = "插入失败，请刷新页面后重试";
    }
  } catch (err) {
    titleEl.textContent = "获取失败，请检查 API 地址";
  }
}
