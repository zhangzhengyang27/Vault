<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getSources,
  createSource,
  updateSource,
  deleteSource,
  runSource,
  runAllSources,
  getCrawlLogs,
  errMsg,
  type CrawlSource,
  type CrawlLog
} from "@/api/admin";

defineOptions({ name: "Sources" });

const TYPE_META: Record<string, string> = {
  news: "资讯",
  tool: "工具",
  prompt: "提示词",
  github: "GitHub",
  knowledge: "知识库"
};

const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, label]) => ({
  value,
  label
}));

const INTERVAL_META: Record<string, string> = {
  minutely: "每分钟",
  hourly: "每小时",
  daily: "每天",
  weekly: "每周"
};

const INTERVAL_OPTIONS = Object.entries(INTERVAL_META).map(
  ([value, label]) => ({ value, label })
);

const items = ref<CrawlSource[]>([]);
const logs = ref<CrawlLog[]>([]);
const loading = ref(false);
const saving = ref(false);
const running = ref(false);
const busyId = ref<number | null>(null);

const editorOpen = ref(false);
const editing = ref<CrawlSource | null>(null);
const form = reactive({
  name: "",
  url: "",
  sourceType: "news",
  crawlInterval: "daily",
  enabled: true,
  description: ""
});

async function load() {
  loading.value = true;
  try {
    const [srcs, lg] = await Promise.all([
      getSources(),
      getCrawlLogs(20)
    ]);
    items.value = Array.isArray(srcs) ? srcs : [];
    logs.value = Array.isArray(lg) ? lg : [];
  } catch (e) {
    message(errMsg(e, "加载失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  Object.assign(form, {
    name: "",
    url: "",
    sourceType: "news",
    crawlInterval: "daily",
    enabled: true,
    description: ""
  });
  editorOpen.value = true;
}

function openEdit(s: CrawlSource) {
  editing.value = s;
  Object.assign(form, {
    name: s.name,
    url: s.url,
    sourceType: s.sourceType,
    crawlInterval: s.crawlInterval,
    enabled: s.enabled,
    description: s.description ?? ""
  });
  editorOpen.value = true;
}

async function save() {
  if (!form.name.trim() || !form.url.trim()) {
    message("请填写名称和 URL", { type: "warning" });
    return;
  }
  saving.value = true;
  try {
    const body = {
      name: form.name.trim(),
      url: form.url.trim(),
      sourceType: form.sourceType,
      crawlInterval: form.crawlInterval,
      enabled: form.enabled,
      description: form.description.trim() || undefined
    };
    if (editing.value) {
      await updateSource(editing.value.id, body);
      message("保存成功", { type: "success" });
    } else {
      await createSource(body);
      message("创建成功", { type: "success" });
    }
    editorOpen.value = false;
    await load();
  } catch (e) {
    message(errMsg(e, "保存失败"), { type: "error" });
  } finally {
    saving.value = false;
  }
}

async function remove(s: CrawlSource) {
  try {
    await ElMessageBox.confirm(`确定删除数据源「${s.name}」吗？`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }
  busyId.value = s.id;
  try {
    await deleteSource(s.id);
    message("已删除", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "删除失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

async function toggleEnabled(s: CrawlSource) {
  busyId.value = s.id;
  try {
    await updateSource(s.id, { enabled: !s.enabled });
    message(s.enabled ? "已停用" : "已启用", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

async function runAll() {
  running.value = true;
  try {
    const res = await runAllSources();
    message(typeof res === "string" ? res : "已触发全量采集", {
      type: "success",
      duration: 4000
    });
    await load();
  } catch (e) {
    message(errMsg(e, "触发失败"), { type: "error" });
  } finally {
    running.value = false;
  }
}

async function runOne(s: CrawlSource) {
  busyId.value = s.id;
  try {
    await runSource(s.id);
    message(`已触发「${s.name}」采集`, { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "采集失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

function logStatusType(log: CrawlLog): "success" | "danger" | "info" {
  if (log.status === "success" || log.level === "log") return "success";
  if (log.status === "error" || log.level === "error") return "danger";
  return "info";
}

function fmtTime(t?: string | null) {
  return t ? new Date(t).toLocaleString("zh-CN") : "—";
}

onMounted(load);
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">数据源管理</h2>
        <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
          维护采集白名单数据源，控制采集频率与启停状态。
        </p>
      </div>
      <div class="flex gap-2">
        <el-button :loading="running" @click="runAll">全量采集</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增数据源
        </el-button>
      </div>
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <span class="font-medium">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="URL" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">{{ row.url }}</span>
          </template>
        </el-table-column>
        <el-table-column label="内容类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">
              {{ TYPE_META[row.sourceType] ?? row.sourceType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="频率" width="90">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ INTERVAL_META[row.crawlInterval] ?? row.crawlInterval }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.enabled ? 'success' : 'info'">
              {{ row.enabled ? "启用中" : "已停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="成功/失败" width="100">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.successCount }} / {{ row.failCount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="上次采集" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime(row.lastCrawledAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="busyId === row.id"
              @click="runOne(row as CrawlSource)"
            >
              采集
            </el-button>
            <el-button
              link
              :type="row.enabled ? 'warning' : 'success'"
              size="small"
              :disabled="busyId === row.id"
              @click="toggleEnabled(row as CrawlSource)"
            >
              {{ row.enabled ? "停用" : "启用" }}
            </el-button>
            <el-button link size="small" @click="openEdit(row as CrawlSource)">
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="busyId === row.id"
              @click="remove(row as CrawlSource)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据源，点击右上角新增" :image-size="80" />
        </template>
      </el-table>
    </el-card>

    <!-- 最近采集日志 -->
    <el-card class="mt-4" shadow="never">
      <el-collapse>
        <el-collapse-item name="logs">
          <template #title>
            <span class="font-semibold">最近采集日志（{{ logs.length }}）</span>
          </template>
          <el-empty v-if="logs.length === 0" description="暂无日志" :image-size="60" />
          <ul v-else class="max-h-80 space-y-2 overflow-y-auto">
            <li
              v-for="log in logs"
              :key="log.id"
              class="flex items-start gap-2 text-xs"
            >
              <span class="shrink-0 text-[var(--el-text-color-secondary)]">
                {{ log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN") : "" }}
              </span>
              <el-tag size="small" :type="logStatusType(log)">
                {{ log.status ?? log.level ?? "info" }}
              </el-tag>
              <span class="text-[var(--el-text-color-regular)]">
                {{ log.sourceName ? `[${log.sourceName}] ` : "" }}{{ log.message }}
              </span>
            </li>
          </ul>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="editorOpen"
      :title="editing ? '编辑数据源' : '新增数据源'"
      width="520px"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如 OpenAI 官方博客" />
        </el-form-item>
        <el-form-item label="URL" required>
          <el-input v-model="form.url" placeholder="https://…/rss.xml" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="内容类型">
              <el-select v-model="form.sourceType" class="w-full!">
                <el-option
                  v-for="o in TYPE_OPTIONS"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采集频率">
              <el-select v-model="form.crawlInterval" class="w-full!">
                <el-option
                  v-for="o in INTERVAL_OPTIONS"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-checkbox v-model="form.enabled">启用该数据源</el-checkbox>
      </el-form>
      <template #footer>
        <el-button @click="editorOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
