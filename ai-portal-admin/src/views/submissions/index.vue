<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  errMsg,
  type Submission
} from "@/api/admin";

defineOptions({ name: "Submissions" });

const LIMIT = 20;

const TYPE_META: Record<string, string> = {
  tool: "工具",
  prompt: "提示词",
  mcp: "MCP",
  resource: "资源",
  news: "资讯"
};

const STATUS_META: Record<string, { label: string; type: "warning" | "success" | "danger" }> = {
  pending: { label: "待审核", type: "warning" },
  approved: { label: "已通过", type: "success" },
  rejected: { label: "已拒绝", type: "danger" }
};

const items = ref<Submission[]>([]);
const total = ref(0);
const page = ref(1);
const filter = ref("pending");
const loading = ref(false);
const busyId = ref<number | null>(null);

const detailOpen = ref(false);
const detail = ref<Submission | null>(null);

async function load() {
  loading.value = true;
  try {
    const data = await getSubmissions(filter.value);
    items.value = Array.isArray(data) ? data : [];
    total.value = items.value.length;
  } catch (e) {
    message(errMsg(e, "加载失败"), { type: "error" });
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function openDetail(item: Submission) {
  detail.value = item;
  detailOpen.value = true;
}

async function approve(item: Submission) {
  busyId.value = item.id;
  try {
    await approveSubmission(item.id);
    message("已通过并发布", { type: "success" });
    detailOpen.value = false;
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

async function reject(item: Submission) {
  let reason: string | undefined;
  try {
    const { value } = await ElMessageBox.prompt(
      "拒绝原因（可选），会通知投稿人。",
      `拒绝「${item.title}」`,
      {
        confirmButtonText: "拒绝",
        cancelButtonText: "取消",
        inputPlaceholder: "如：内容重复 / 信息不实 / 与站点无关"
      }
    );
    reason = value?.trim() || undefined;
  } catch {
    return;
  }
  busyId.value = item.id;
  try {
    await rejectSubmission(item.id, reason);
    message("已拒绝", { type: "success" });
    detailOpen.value = false;
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
watch([filter, page], () => load());
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">投稿审核</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        审核用户提交的工具、提示词、MCP、资源和资讯，通过后自动发布。
      </p>
    </div>

    <div class="mb-4">
      <el-radio-group v-model="filter" size="small">
        <el-radio-button value="pending">待审核</el-radio-button>
        <el-radio-button value="approved">已通过</el-radio-button>
        <el-radio-button value="rejected">已拒绝</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" type="primary">
              {{ TYPE_META[row.type] ?? row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="220">
          <template #default="{ row }">
            <a
              class="cursor-pointer font-medium hover:text-[var(--el-color-primary)]"
              @click="openDetail(row as Submission)"
            >
              {{ row.title }}
            </a>
            <span class="ml-2 text-xs text-[var(--el-text-color-secondary)]">
              #{{ row.id }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="简介" min-width="240">
          <template #default="{ row }">
            <span class="line-clamp-2 text-sm text-[var(--el-text-color-secondary)]">
              {{ row.description || "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="(STATUS_META[row.status] ?? STATUS_META.pending).type"
            >
              {{ (STATUS_META[row.status] ?? STATUS_META.pending).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" align="right" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row as Submission)">
              详情
            </el-button>
            <template v-if="row.status === 'pending'">
              <el-button
                link
                type="success"
                size="small"
                :disabled="busyId === row.id"
                @click="approve(row as Submission)"
              >
                通过
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                :disabled="busyId === row.id"
                @click="reject(row as Submission)"
              >
                拒绝
              </el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="filter === 'pending' ? '暂无待审核内容' : '没有符合条件的记录'"
            :image-size="80"
          />
        </template>
      </el-table>
      <div class="flex items-center justify-between p-3">
        <span class="text-xs text-[var(--el-text-color-secondary)]">
          共 {{ total }} 条
        </span>
        <el-pagination
          v-model:current-page="page"
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="LIMIT"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailOpen"
      :title="`投稿详情 · ${detail ? (TYPE_META[detail.type] ?? detail.type) : ''}`"
      width="640px"
      destroy-on-close
    >
      <template v-if="detail">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
          <el-tag size="small" :type="(STATUS_META[detail.status] ?? STATUS_META.pending).type">
            {{ (STATUS_META[detail.status] ?? STATUS_META.pending).label }}
          </el-tag>
          <span>#{{ detail.id }}</span>
          <span>{{ fmtTime(detail.createdAt) }}</span>
          <span v-if="detail.reviewedAt">审核于 {{ fmtTime(detail.reviewedAt) }}</span>
        </div>

        <h4 class="mb-2 text-base font-semibold">{{ detail.title }}</h4>

        <p
          v-if="detail.description"
          class="mb-3 text-sm text-[var(--el-text-color-regular)]"
        >
          {{ detail.description }}
        </p>

        <div
          v-if="detail.content"
          class="max-h-[40vh] overflow-y-auto rounded-lg bg-[var(--el-fill-color-light)] p-3 text-sm leading-relaxed whitespace-pre-wrap text-[var(--el-text-color-regular)]"
        >
          {{ detail.content }}
        </div>

        <a
          v-if="detail.url"
          :href="detail.url"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-block break-all text-xs text-[var(--el-color-primary)] hover:underline"
        >
          {{ detail.url }}
        </a>

        <p v-if="detail.contact" class="mt-3 text-xs text-[var(--el-text-color-secondary)]">
          联系方式：{{ detail.contact }}
        </p>
        <p v-if="detail.rejectReason" class="mt-2 text-xs text-rose-500">
          拒绝原因：{{ detail.rejectReason }}
        </p>
      </template>
      <template #footer>
        <el-button @click="detailOpen = false">关闭</el-button>
        <template v-if="detail?.status === 'pending'">
          <el-button
            type="danger"
            plain
            :disabled="busyId === detail?.id"
            @click="reject(detail as Submission)"
          >
            拒绝
          </el-button>
          <el-button
            type="success"
            :disabled="busyId === detail?.id"
            @click="approve(detail as Submission)"
          >
            通过
          </el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>
