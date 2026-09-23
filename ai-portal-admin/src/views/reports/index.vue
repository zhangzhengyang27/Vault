<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { message } from "@/utils/message";
import {
  getReports,
  updateReportStatus,
  errMsg,
  type ReportItem
} from "@/api/admin";

defineOptions({ name: "Reports" });

const LIMIT = 20;

const TARGET_LABELS: Record<string, string> = {
  tool: "工具",
  prompt: "提示词",
  article: "文章",
  news: "资讯",
  repo: "开源",
  resource: "资源",
  mcp: "MCP",
  post: "帖子"
};

const items = ref<ReportItem[]>([]);
const page = ref(1);
const filter = ref("open");
const loading = ref(false);
const busyId = ref<number | null>(null);

const pagedItems = ref<ReportItem[]>([]);

async function load() {
  loading.value = true;
  try {
    const data = await getReports(filter.value);
    items.value = Array.isArray(data) ? data : (data.items ?? []);
    page.value = 1;
    slicePage();
  } catch {
    // 保持旧列表
  } finally {
    loading.value = false;
  }
}

function slicePage() {
  pagedItems.value = items.value.slice((page.value - 1) * LIMIT, page.value * LIMIT);
}

watch(page, slicePage);

async function setStatus(item: ReportItem, status: "open" | "resolved") {
  busyId.value = item.id;
  try {
    await updateReportStatus(item.id, status);
    message(status === "resolved" ? "已标记处理" : "已重新打开", {
      type: "success"
    });
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
watch(filter, load);
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">举报管理</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        处理用户对内容的举报，核实后标记完成。
      </p>
    </div>

    <div class="mb-4">
      <el-radio-group v-model="filter" size="small">
        <el-radio-button value="open">待处理</el-radio-button>
        <el-radio-button value="resolved">已处理</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="pagedItems" stripe style="width: 100%">
        <el-table-column label="目标" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-tag size="small" type="info">
                {{ TARGET_LABELS[row.targetType] ?? row.targetType }}
              </el-tag>
              <span class="truncate font-medium">
                {{ row.targetTitle || `#${row.targetId}` }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="举报原因" min-width="220">
          <template #default="{ row }">
            <span class="line-clamp-2 text-sm text-[var(--el-text-color-regular)]">
              {{ row.reason }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="举报人" width="120">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ row.reporter ? "@" + row.reporter : "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'resolved' ? 'success' : 'warning'">
              {{ row.status === "resolved" ? "已处理" : "待处理" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'open'"
              link
              type="success"
              size="small"
              :disabled="busyId === row.id"
              @click="setStatus(row as ReportItem, 'resolved')"
            >
              标记已处理
            </el-button>
            <el-button
              v-else
              link
              type="primary"
              size="small"
              :disabled="busyId === row.id"
              @click="setStatus(row as ReportItem, 'open')"
            >
              重新打开
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无举报记录。" :image-size="80" />
        </template>
      </el-table>
      <div class="flex items-center justify-between p-3">
        <span class="text-xs text-[var(--el-text-color-secondary)]">
          共 {{ items.length }} 条
        </span>
        <el-pagination
          v-model:current-page="page"
          background
          layout="prev, pager, next"
          :total="items.length"
          :page-size="LIMIT"
        />
      </div>
    </el-card>
  </div>
</template>
