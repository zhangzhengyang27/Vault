<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import { useUserStore } from "@/store/modules/user";
import {
  getOnlineUsers,
  forceLogout,
  errMsg,
  type OnlineUserItem
} from "@/api/monitor";

defineOptions({ name: "OnlineUsers" });

const { username: myUsername } = storeToRefs(useUserStore());

const items = ref<OnlineUserItem[]>([]);
const loading = ref(false);

const isSelf = (row: OnlineUserItem) => row.username === myUsername.value;

function fmtLastSeen(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return new Date(ts).toLocaleString("zh-CN");
}

async function load() {
  loading.value = true;
  try {
    const data = await getOnlineUsers();
    items.value = Array.isArray(data) ? data : [];
  } catch (e) {
    message(errMsg(e, "加载失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function kick(row: OnlineUserItem) {
  try {
    await ElMessageBox.confirm(
      `确定强制下线「${row.username}」吗？其后续请求将立即失效，重新登录可恢复。`,
      "强制下线",
      { type: "warning", confirmButtonText: "强制下线", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  await forceLogout(row.userId);
  message("已强制下线", { type: "success" });
  await load();
}

onMounted(load);
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">在线用户</h2>
        <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
          最近 30 分钟内有请求活动的用户；强退后其现有登录立即失效。
        </p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ row.username }}</span>
              <el-tag v-if="isSelf(row)" size="small" type="info">我</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'admin' ? 'primary' : 'info'">
              {{ row.role === "admin" ? "管理员" : "普通用户" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="150">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.ip ?? "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="User-Agent" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ row.userAgent ?? "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最后活跃" width="130">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ fmtLastSeen(row.lastSeen) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              size="small"
              :disabled="isSelf(row)"
              @click="kick(row)"
            >
              强制下线
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="当前没有在线用户" :image-size="80" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>
