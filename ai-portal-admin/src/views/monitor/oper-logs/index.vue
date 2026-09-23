<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getOperLogs,
  getOperLogDetail,
  clearOperLogs,
  errMsg,
  type OperLogItem
} from "@/api/monitor";

defineOptions({ name: "OperLogs" });

const LIMIT = 20;

const items = ref<OperLogItem[]>([]);
const total = ref(0);
const page = ref(1);
const username = ref("");
const usernameInput = ref("");
const loading = ref(false);

const detailOpen = ref(false);
const detail = ref<OperLogItem | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

const METHOD_TAG: Record<string, "primary" | "success" | "warning" | "danger"> = {
  POST: "success",
  PATCH: "warning",
  PUT: "warning",
  DELETE: "danger"
};

async function load() {
  loading.value = true;
  try {
    const data = await getOperLogs({
      page: page.value,
      limit: LIMIT,
      username: username.value
    });
    items.value = data.items ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    message(errMsg(e, "加载失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

function onSearchInput(value: string) {
  usernameInput.value = value;
  clearTimeout(timer);
  timer = setTimeout(() => {
    username.value = value;
    page.value = 1;
  }, 300);
}

async function openDetail(row: OperLogItem) {
  try {
    detail.value = await getOperLogDetail(row.id);
  } catch {
    detail.value = row;
  }
  detailOpen.value = true;
}

function prettyBody(body: string | null) {
  if (!body) return "（无请求体）";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

async function clear() {
  try {
    await ElMessageBox.confirm(
      "确定清空全部操作日志吗？此操作不可恢复。",
      "清空确认",
      { type: "warning", confirmButtonText: "清空", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  await clearOperLogs();
  message("已清空", { type: "success" });
  page.value = 1;
  await load();
}

function fmtTime(t?: string) {
  return t ? new Date(t).toLocaleString("zh-CN") : "—";
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));
watch([username, page], () => load());
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">操作日志</h2>
        <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
          自动记录管理端变更类请求（新增/修改/删除），含失败请求与请求体。
        </p>
      </div>
      <el-button type="danger" plain @click="clear">清空日志</el-button>
    </div>

    <div class="mb-4 flex justify-end">
      <el-input
        v-model="usernameInput"
        class="w-56!"
        size="small"
        clearable
        placeholder="搜索操作人…"
        :prefix-icon="Search"
        @input="onSearchInput"
      />
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table
        v-loading="loading"
        :data="items"
        stripe
        style="width: 100%"
        @row-click="openDetail"
      >
        <el-table-column prop="username" label="操作人" min-width="110" />
        <el-table-column label="方法" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="METHOD_TAG[row.method] ?? 'info'">
              {{ row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="路径" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.path }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态码" width="90">
          <template #default="{ row }">
            <span :class="row.statusCode < 400 ? 'text-emerald-500' : 'text-rose-500'">
              {{ row.statusCode }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="90">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.durationMs }}ms
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作人 IP" width="130">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.ip ?? "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="right" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="openDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无操作日志" :image-size="80" />
        </template>
      </el-table>
      <div class="flex justify-end p-3">
        <el-pagination
          v-model:current-page="page"
          background
          layout="prev, pager, next, total"
          :total="total"
          :page-size="LIMIT"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailOpen" title="操作日志详情" width="640px" destroy-on-close>
      <template v-if="detail">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
          <el-tag size="small" :type="METHOD_TAG[detail.method] ?? 'info'">
            {{ detail.method }}
          </el-tag>
          <span>{{ detail.path }}</span>
          <span>状态 {{ detail.statusCode }}</span>
          <span>{{ detail.durationMs }}ms</span>
          <span>{{ fmtTime(detail.createdAt) }}</span>
        </div>
        <div class="mb-3 text-sm">
          操作人：<span class="font-medium">{{ detail.username }}</span>
          <span class="ml-3 text-[var(--el-text-color-secondary)]">
            {{ detail.ip ?? "—" }}
          </span>
        </div>
        <div class="mb-2 text-xs text-[var(--el-text-color-secondary)]">请求体</div>
        <pre
          class="max-h-[40vh] overflow-auto rounded-lg bg-[var(--el-fill-color-light)] p-3 font-mono text-xs leading-relaxed"
        >{{ prettyBody(detail.body) }}</pre>
        <div class="mt-3 text-xs break-all text-[var(--el-text-color-secondary)]">
          User-Agent: {{ detail.userAgent ?? "—" }}
        </div>
      </template>
    </el-dialog>
  </div>
</template>
