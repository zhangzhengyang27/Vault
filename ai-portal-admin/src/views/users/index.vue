<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import {
  getUserList,
  updateUserStatus,
  updateUserRole,
  errMsg,
  type UserRow
} from "@/api/admin";

defineOptions({ name: "Users" });

const LIMIT = 20;

const items = ref<UserRow[]>([]);
const total = ref(0);
const page = ref(1);
const role = ref("all");
const status = ref("all");
const search = ref("");
const searchInput = ref("");
const loading = ref(false);
const busyId = ref<number | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

const userStore = useUserStoreHook();

/** 自身不可操作（封禁/降权均不允许操作自己） */
const selfUsername = computed(() => userStore.username);

const ROLE_META: Record<string, { label: string; type: "warning" | "info" }> = {
  admin: { label: "管理员", type: "warning" },
  user: { label: "普通用户", type: "info" }
};

const STATUS_META: Record<string, { label: string; type: "success" | "danger" }> = {
  active: { label: "正常", type: "success" },
  banned: { label: "已封禁", type: "danger" }
};

const roleOptions = [
  { value: "all", label: "全部角色" },
  { value: "admin", label: "管理员" },
  { value: "user", label: "普通用户" }
];

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "正常" },
  { value: "banned", label: "已封禁" }
];

const roleLabel = (v: string) => ROLE_META[v]?.label ?? v;
const roleTagType = (v: string) => ROLE_META[v]?.type ?? "info";
const statusLabel = (v: string) => STATUS_META[v]?.label ?? v;
const statusTagType = (v: string) => STATUS_META[v]?.type ?? "info";

async function load() {
  loading.value = true;
  try {
    const data = await getUserList({
      page: page.value,
      limit: LIMIT,
      role: role.value,
      status: status.value,
      q: search.value
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
  searchInput.value = value;
  // 防抖 300ms，避免每个按键都请求一次后台
  clearTimeout(timer);
  timer = setTimeout(() => {
    search.value = value;
    page.value = 1;
  }, 300);
}

async function toggleStatus(row: UserRow) {
  const next: "active" | "banned" = row.status === "banned" ? "active" : "banned";
  const verb = next === "banned" ? "封禁" : "解封";
  try {
    await ElMessageBox.confirm(
      `确定${verb}用户「${row.username}」吗？`,
      `${verb}确认`,
      { type: "warning", confirmButtonText: verb, cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await updateUserStatus(row.id, next);
    message(next === "banned" ? "已封禁" : "已解封", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

async function changeRole(row: UserRow) {
  const next: "user" | "admin" = row.role === "admin" ? "user" : "admin";
  const verb = next === "admin" ? "提权为管理员" : "降权为普通用户";
  try {
    await ElMessageBox.confirm(
      `确定将用户「${row.username}」${verb}吗？`,
      "角色变更确认",
      { type: "warning", confirmButtonText: "确认", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await updateUserRole(row.id, next);
    message("角色已变更", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

function fmtTime(t?: string) {
  return t ? new Date(t).toLocaleString("zh-CN") : "—";
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));
watch([role, status, page], () => load());
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">用户管理</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        管理注册用户：搜索/筛选/分页，封禁解封、角色变更（自身不可操作）。
      </p>
    </div>

    <!-- 筛选栏 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <el-select v-model="role" class="w-32!" size="small">
          <el-option
            v-for="o in roleOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
        <el-select v-model="status" class="w-32!" size="small">
          <el-option
            v-for="o in statusOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </div>
      <el-input
        v-model="searchInput"
        class="w-56!"
        size="small"
        clearable
        placeholder="搜索用户名/邮箱…"
        :prefix-icon="Search"
        @input="onSearchInput"
      />
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="用户名" min-width="160">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ row.username }}</span>
              <el-tag
                v-if="row.username === selfUsername"
                size="small"
                type="info"
              >
                当前账号
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="邮箱" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.email || "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="roleTagType(row.role)">
              {{ roleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="160"
          align="right"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              :type="row.status === 'banned' ? 'success' : 'danger'"
              size="small"
              :disabled="busyId === row.id || row.username === selfUsername"
              @click="toggleStatus(row as UserRow)"
            >
              {{ row.status === "banned" ? "解封" : "封禁" }}
            </el-button>
            <el-button
              link
              :type="row.role === 'admin' ? 'warning' : 'primary'"
              size="small"
              :disabled="busyId === row.id || row.username === selfUsername"
              @click="changeRole(row as UserRow)"
            >
              {{ row.role === "admin" ? "降权" : "提权" }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的用户" :image-size="80" />
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
