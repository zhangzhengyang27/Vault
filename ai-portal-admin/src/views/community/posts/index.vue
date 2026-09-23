<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getAdminPosts,
  setPostStatus,
  deleteAdminPost,
  errMsg,
  type AdminPostItem
} from "@/api/community";
import { errMsg as apiErrMsg } from "@/api/admin";

defineOptions({ name: "CommunityPosts" });

const LIMIT = 20;

const items = ref<AdminPostItem[]>([]);
const total = ref(0);
const page = ref(1);
const search = ref("");
const searchInput = ref("");
const loading = ref(false);
const busyId = ref<number | null>(null);

const detailOpen = ref(false);
const detail = ref<AdminPostItem | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

const authorOf = (row: AdminPostItem) =>
  row.authorUsername || row.authorName || "匿名";

async function load() {
  loading.value = true;
  try {
    const data = await getAdminPosts({
      page: page.value,
      limit: LIMIT,
      q: search.value
    });
    items.value = data.items ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    message(apiErrMsg(e, errMsg(e, "加载失败")), { type: "error" });
  } finally {
    loading.value = false;
  }
}

function onSearchInput(value: string) {
  searchInput.value = value;
  clearTimeout(timer);
  timer = setTimeout(() => {
    search.value = value;
    page.value = 1;
  }, 300);
}

function openDetail(row: AdminPostItem) {
  detail.value = row;
  detailOpen.value = true;
}

async function toggleStatus(row: AdminPostItem) {
  const next: "published" | "hidden" =
    row.status === "published" ? "hidden" : "published";
  const verb = next === "hidden" ? "下架" : "恢复展示";
  try {
    await ElMessageBox.confirm(
      `确定${verb}帖子「${row.title}」吗？`,
      `${verb}确认`,
      { type: "warning", confirmButtonText: verb, cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await setPostStatus(row.id, next);
    message(next === "hidden" ? "已下架" : "已恢复展示", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

async function remove(row: AdminPostItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除帖子「${row.title}」吗？其点赞、评论、收藏将一并删除，不可恢复。`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await deleteAdminPost(row.id);
    message("已删除", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "删除失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

function fmtTime(t?: string) {
  return t ? new Date(t).toLocaleString("zh-CN") : "—";
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));
watch([search, page], () => load());
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">帖子管理</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        管理社区帖子：查看、下架/恢复、删除（删除会连带清理点赞与评论）。
      </p>
    </div>

    <div class="mb-4 flex justify-end">
      <el-input
        v-model="searchInput"
        class="w-56!"
        size="small"
        clearable
        placeholder="搜索标题/内容…"
        :prefix-icon="Search"
        @input="onSearchInput"
      />
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="标题" min-width="240">
          <template #default="{ row }">
            <a
              class="cursor-pointer font-medium hover:text-[var(--el-color-primary)]"
              @click="openDetail(row as AdminPostItem)"
            >
              {{ row.title }}
            </a>
          </template>
        </el-table-column>
        <el-table-column label="作者" width="130">
          <template #default="{ row }">
            <span class="text-[var(--el-text-color-secondary)]">
              {{ authorOf(row as AdminPostItem) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="likes" label="点赞" width="80" />
        <el-table-column prop="comments" label="评论" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.status === 'published' ? 'success' : 'info'"
            >
              {{ row.status === "published" ? "展示中" : "已下架" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime(row.createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="right" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row as AdminPostItem)">
              详情
            </el-button>
            <el-button
              link
              :type="row.status === 'published' ? 'warning' : 'success'"
              size="small"
              :disabled="busyId === row.id"
              @click="toggleStatus(row as AdminPostItem)"
            >
              {{ row.status === "published" ? "下架" : "恢复" }}
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="busyId === row.id"
              @click="remove(row as AdminPostItem)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的帖子" :image-size="80" />
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

    <!-- 帖子详情 -->
    <el-dialog v-model="detailOpen" title="帖子详情" width="640px" destroy-on-close>
      <template v-if="detail">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
          <span>#{{ detail.id }}</span>
          <span>作者：{{ authorOf(detail) }}</span>
          <span>点赞 {{ detail.likes }} · 评论 {{ detail.comments }}</span>
          <span>{{ fmtTime(detail.createdAt) }}</span>
        </div>
        <h4 class="mb-2 text-base font-semibold">{{ detail.title }}</h4>
        <div
          class="max-h-[50vh] overflow-y-auto rounded-lg bg-[var(--el-fill-color-light)] p-3 text-sm leading-relaxed whitespace-pre-wrap text-[var(--el-text-color-regular)]"
        >
          {{ detail.content }}
        </div>
      </template>
    </el-dialog>
  </div>
</template>
