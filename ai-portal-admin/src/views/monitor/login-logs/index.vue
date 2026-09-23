<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getLoginLogs,
  deleteLoginLog,
  clearLoginLogs,
  errMsg,
  type LoginLogItem
} from "@/api/monitor";

defineOptions({ name: "LoginLogs" });

const LIMIT = 20;

const items = ref<LoginLogItem[]>([]);
const total = ref(0);
const page = ref(1);
const username = ref("");
const usernameInput = ref("");
const success = ref("all");
const loading = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;

async function load() {
  loading.value = true;
  try {
    const data = await getLoginLogs({
      page: page.value,
      limit: LIMIT,
      username: username.value,
      success: success.value
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

async function remove(row: LoginLogItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.username}」的这条登录记录吗？`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  await deleteLoginLog(row.id);
  message("已删除", { type: "success" });
  await load();
}

async function clear() {
  try {
    await ElMessageBox.confirm(
      "确定清空全部登录日志吗？此操作不可恢复。",
      "清空确认",
      { type: "warning", confirmButtonText: "清空", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  await clearLoginLogs();
  message("已清空", { type: "success" });
  page.value = 1;
  await load();
}

function fmtTime(t?: string) {
  return t ? new Date(t).toLocaleString("zh-CN") : "—";
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));
watch([username, success, page], () => load());
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">登录日志</h2>
        <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
          记录所有登录尝试（含失败），用于安全审计与异常登录排查。
        </p>
      </div>
      <el-button type="danger" plain @click="clear">清空日志</el-button>
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <el-select v-model="success" size="small" class="w-28!" @change="page = 1">
        <el-option label="全部结果" value="all" />
        <el-option label="成功" value="true" />
        <el-option label="失败" value="false" />
      </el-select>
      <el-input
        v-model="usernameInput"
        class="w-56!"
        size="small"
        clearable
        placeholder="搜索用户名…"
        :prefix-icon="Search"
        @input="onSearchInput"
      />
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column label="结果" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.success ? 'success' : 'danger'">
              {{ row.success ? "成功" : "失败" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="160">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.message ?? "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="140">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.ip ?? "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="User-Agent" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ row.userAgent ?? "—" }}
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
        <el-table-column label="操作" width="80" align="right" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无登录日志" :image-size="80" />
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
  </div>
</template>
