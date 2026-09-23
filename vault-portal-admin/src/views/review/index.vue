<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getReviewList,
  reviewOne,
  reviewBatch,
  errMsg,
  type ReviewItem,
  type ReviewStatus,
  type ReviewType
} from "@/api/admin";

defineOptions({ name: "Review" });

const TYPE_META: Record<ReviewType, { label: string; titleField: "name" | "title" }> = {
  news: { label: "资讯", titleField: "title" },
  tool: { label: "工具", titleField: "name" },
  prompt: { label: "提示词", titleField: "title" },
  github: { label: "GitHub", titleField: "name" },
  knowledge: { label: "知识库", titleField: "title" },
  mcp: { label: "MCP", titleField: "name" },
  resource: { label: "学习资源", titleField: "title" }
};

const TYPE_KEYS = Object.keys(TYPE_META) as ReviewType[];

const PAGE_SIZE = 20;

const type = ref<ReviewType>("news");
// 状态页签：pending=待审核（先审后发模式用）；published=已发布（可下架）；rejected=已拒绝
// 采集内容默认免审直发（CRAWLER_AUTO_PUBLISH），日常主要在「已发布」页签做下架
const statusFilter = ref<ReviewStatus>("pending");
const STATUS_META: Record<ReviewStatus, { label: string }> = {
  pending: { label: "待审核" },
  published: { label: "已发布" },
  rejected: { label: "已拒绝" }
};
const STATUS_KEYS = Object.keys(STATUS_META) as ReviewStatus[];
const items = ref<ReviewItem[]>([]);
const loading = ref(false);
const busyId = ref<number | null>(null);
const bulkBusy = ref(false);
const page = ref(1);

const tableRef = ref<{ clearSelection: () => void }>();
const selectedRows = ref<ReviewItem[]>([]);

const detailOpen = ref(false);
const detailItem = ref<ReviewItem | null>(null);

const meta = computed(() => TYPE_META[type.value]);
const statusMeta = computed(() => STATUS_META[statusFilter.value]);
// 拒绝动作在「已发布」页签语义为下架
const rejectVerb = computed(() =>
  statusFilter.value === "published" ? "下架" : "拒绝"
);
const selectedIds = computed(() => selectedRows.value.map(r => r.id));
const pagedItems = computed(() =>
  items.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
);

const titleOf = (item: ReviewItem) =>
  item[meta.value.titleField] ?? item.title ?? item.name ?? item.slug;
const summaryOf = (item: ReviewItem) => item.description ?? item.summary ?? "";

async function load() {
  loading.value = true;
  try {
    const data = await getReviewList(type.value, statusFilter.value);
    items.value = Array.isArray(data) ? data : [];
    // 数据刷新后当前页可能越界（如批量通过后队列清空）
    if ((page.value - 1) * PAGE_SIZE >= items.value.length) page.value = 1;
  } catch (e) {
    message(errMsg(e, "加载失败"), { type: "error" });
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function onSelectionChange(rows: ReviewItem[]) {
  selectedRows.value = rows;
}

function clearSelection() {
  tableRef.value?.clearSelection();
  selectedRows.value = [];
}

async function review(id: number, action: "approve" | "reject") {
  busyId.value = id;
  try {
    await reviewOne(type.value, id, action);
    message(action === "approve" ? "已通过" : `已${rejectVerb.value}`, {
      type: "success"
    });
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

/** 详情弹窗内的单条审核，成功后关闭弹窗 */
async function reviewFromDetail(action: "approve" | "reject") {
  if (!detailItem.value) return;
  const id = detailItem.value.id;
  await review(id, action);
  detailOpen.value = false;
}

function openDetail(item: ReviewItem) {
  detailItem.value = item;
  detailOpen.value = true;
}

/**
 * 批量审核。scope=selected 只处理勾选项（row-key + reserve-selection 支持
 * 跨页保留勾选）；scope=all 处理该类型全部待审（后端单次上限 500，剩余可再点）。
 */
async function runBulk(action: "approve" | "reject", scope: "selected" | "all") {
  const ids = scope === "selected" ? selectedIds.value : undefined;
  if (scope === "selected" && ids.length === 0) return;

  const verb = action === "approve" ? "通过" : rejectVerb.value;
  const target =
    scope === "all"
      ? `当前${statusMeta.value.label}的全部${meta.value.label}（每次最多 500 条）`
      : `选中的 ${ids.length} 条${meta.value.label}`;
  try {
    await ElMessageBox.confirm(`确认${verb}${target}？`, "批量审核", {
      type: "warning",
      confirmButtonText: verb,
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }

  bulkBusy.value = true;
  try {
    // scope=all 按当前状态页签圈定范围（后端按 status 查询后批量翻转）
    const res = await reviewBatch(
      type.value,
      action,
      ids,
      scope === "all" ? statusFilter.value : undefined
    );
    clearSelection();
    await load();
    if (res.remaining > 0) {
      message(
        `本次${verb} ${res.updated} 条，还剩 ${res.remaining} 条，可再次点击「全部${verb}」继续。`,
        { type: "info", duration: 5000 }
      );
    }
  } catch (e) {
    message(errMsg(e, "批量操作失败"), { type: "error" });
  } finally {
    bulkBusy.value = false;
  }
}

onMounted(load);
watch(type, () => {
  // 切换内容类型时清空选择并回到第一页，避免把上一类的 id 带过去
  clearSelection();
  page.value = 1;
  load();
});
watch(statusFilter, () => {
  clearSelection();
  page.value = 1;
  load();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">采集审核</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        采集内容默认免审自动发布；在「已发布」页签可下架违规内容。设环境变量
        CRAWLER_AUTO_PUBLISH=false 可恢复「先审后发」模式。
      </p>
    </div>

    <!-- 筛选行：类型切换 + 状态页签 + 批量操作 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <el-radio-group v-model="type" size="small">
          <el-radio-button v-for="k in TYPE_KEYS" :key="k" :value="k">
            {{ TYPE_META[k].label }}
          </el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="statusFilter" size="small">
          <el-radio-button v-for="s in STATUS_KEYS" :key="s" :value="s">
            {{ STATUS_META[s].label }}
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="statusFilter === 'pending'">
          <el-button
            size="small"
            type="success"
            :disabled="bulkBusy || selectedIds.length === 0"
            @click="runBulk('approve', 'selected')"
          >
            通过所选（{{ selectedIds.length }}）
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="bulkBusy || selectedIds.length === 0"
            @click="runBulk('reject', 'selected')"
          >
            拒绝所选
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            size="small"
            type="success"
            plain
            :disabled="bulkBusy"
            @click="runBulk('approve', 'all')"
          >
            全部通过
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="bulkBusy"
            @click="runBulk('reject', 'all')"
          >
            全部拒绝
          </el-button>
        </template>
        <template v-else-if="statusFilter === 'published'">
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="bulkBusy || selectedIds.length === 0"
            @click="runBulk('reject', 'selected')"
          >
            下架所选（{{ selectedIds.length }}）
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="bulkBusy"
            @click="runBulk('reject', 'all')"
          >
            全部下架
          </el-button>
        </template>
      </div>
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="pagedItems"
        row-key="id"
        stripe
        style="width: 100%"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="45" reserve-selection />
        <el-table-column label="标题" min-width="240">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-tag size="small" type="info">{{ meta.label }}</el-tag>
              <a
                class="cursor-pointer font-medium hover:text-[var(--el-color-primary)]"
                @click="openDetail(row as ReviewItem)"
              >
                {{ titleOf(row as ReviewItem) }}
              </a>
              <span class="text-xs text-[var(--el-text-color-secondary)]">
                #{{ row.id }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="摘要" min-width="300">
          <template #default="{ row }">
            <span class="line-clamp-2 text-sm text-[var(--el-text-color-secondary)]">
              {{ summaryOf(row as ReviewItem) || "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="采集时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ row.createdAt ? new Date(row.createdAt).toLocaleString("zh-CN") : "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="openDetail(row as ReviewItem)"
            >
              查看详情
            </el-button>
            <el-button
              v-if="statusFilter === 'pending'"
              link
              type="success"
              size="small"
              :disabled="busyId === row.id || bulkBusy"
              @click="review(row.id, 'approve')"
            >
              通过
            </el-button>
            <el-button
              v-if="statusFilter !== 'rejected'"
              link
              type="danger"
              size="small"
              :disabled="busyId === row.id || bulkBusy"
              @click="review(row.id, 'reject')"
            >
              {{ rejectVerb }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="`暂无${statusMeta.label}的${meta.label}内容`"
            :image-size="80"
          />
        </template>
      </el-table>
      <div class="flex items-center justify-between p-3">
        <span class="text-xs text-[var(--el-text-color-secondary)]">
          共 {{ items.length }} 条{{ statusMeta.label }}
        </span>
        <el-pagination
          v-model:current-page="page"
          background
          layout="prev, pager, next"
          :total="items.length"
          :page-size="PAGE_SIZE"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailOpen"
      :title="`详情 · ${meta.label}`"
      width="640px"
      destroy-on-close
    >
      <template v-if="detailItem">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <el-tag size="small" type="info">{{ meta.label }}</el-tag>
          <span class="text-xs text-[var(--el-text-color-secondary)]">
            #{{ detailItem.id }}
          </span>
          <span
            v-if="detailItem.slug"
            class="text-xs text-[var(--el-text-color-secondary)]"
          >
            slug: {{ detailItem.slug }}
          </span>
          <span
            v-if="detailItem.createdAt"
            class="text-xs text-[var(--el-text-color-secondary)]"
          >
            {{ new Date(detailItem.createdAt).toLocaleString("zh-CN") }}
          </span>
        </div>

        <h4 class="mb-2 text-base font-semibold">{{ titleOf(detailItem) }}</h4>

        <p
          v-if="summaryOf(detailItem)"
          class="mb-3 text-sm text-[var(--el-text-color-regular)]"
        >
          {{ summaryOf(detailItem) }}
        </p>

        <div
          v-if="detailItem.content"
          class="max-h-[45vh] overflow-y-auto rounded-lg bg-[var(--el-fill-color-light)] p-3 text-sm leading-relaxed whitespace-pre-wrap text-[var(--el-text-color-regular)]"
        >
          {{ detailItem.content }}
        </div>

        <a
          v-if="detailItem.url"
          :href="detailItem.url"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-block break-all text-xs text-[var(--el-color-primary)] hover:underline"
        >
          {{ detailItem.url }}
        </a>
      </template>
      <template #footer>
        <el-button @click="detailOpen = false">关闭</el-button>
        <el-button
          v-if="statusFilter !== 'rejected'"
          type="danger"
          plain
          :disabled="busyId === detailItem?.id"
          @click="reviewFromDetail('reject')"
        >
          {{ rejectVerb }}
        </el-button>
        <el-button
          v-if="statusFilter === 'pending'"
          type="success"
          :disabled="busyId === detailItem?.id"
          @click="reviewFromDetail('approve')"
        >
          通过
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
