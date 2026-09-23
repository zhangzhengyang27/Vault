<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getAdminComments,
  deleteAdminComment,
  type AdminCommentItem
} from "@/api/community";
import { errMsg } from "@/api/admin";

defineOptions({ name: "CommunityComments" });

const LIMIT = 20;

const TARGET_META: Record<string, { label: string; type: "primary" | "success" | "warning" | "danger" | "info" }> = {
  post: { label: "帖子", type: "primary" },
  tool: { label: "工具", type: "success" },
  prompt: { label: "提示词", type: "warning" },
  article: { label: "文章", type: "danger" },
  news: { label: "资讯", type: "info" }
};

const items = ref<AdminCommentItem[]>([]);
const total = ref(0);
const page = ref(1);
const search = ref("");
const searchInput = ref("");
const targetType = ref("all");
const loading = ref(false);
const busyId = ref<number | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

const targetText = (row: AdminCommentItem) =>
  row.targetType === "post" && row.postTitle
    ? row.postTitle
    : `#${row.targetId ?? "—"}`;

const authorOf = (row: AdminCommentItem) =>
  row.authorUsername || row.authorName || "匿名";

async function load() {
  loading.value = true;
  try {
    const data = await getAdminComments({
      page: page.value,
      limit: LIMIT,
      q: search.value,
      targetType: targetType.value
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
  clearTimeout(timer);
  timer = setTimeout(() => {
    search.value = value;
    page.value = 1;
  }, 300);
}

async function remove(row: AdminCommentItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${authorOf(row)}」的这条评论吗？`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await deleteAdminComment(row.id);
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
watch([search, targetType, page], () => load());
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">评论管理</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        管理帖子、工具、提示词、文章、资讯的全部评论，删除后对应计数自动回退。
      </p>
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <el-select v-model="targetType" size="small" class="w-32!" @change="page = 1">
        <el-option label="全部类型" value="all" />
        <el-option label="帖子" value="post" />
        <el-option label="工具" value="tool" />
        <el-option label="提示词" value="prompt" />
        <el-option label="文章" value="article" />
        <el-option label="资讯" value="news" />
      </el-select>
      <el-input
        v-model="searchInput"
        class="w-56!"
        size="small"
        clearable
        placeholder="搜索评论内容…"
        :prefix-icon="Search"
        @input="onSearchInput"
      />
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="评论人" width="120">
          <template #default="{ row }">
            <span class="font-medium">
              {{ authorOf(row as AdminCommentItem) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="目标" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-tag size="small" :type="(TARGET_META[row.targetType] ?? TARGET_META.post).type">
                {{ (TARGET_META[row.targetType] ?? TARGET_META.post).label }}
              </el-tag>
              <span class="truncate text-[var(--el-text-color-secondary)]">
                {{ targetText(row as AdminCommentItem) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="280">
          <template #default="{ row }">
            <span class="line-clamp-2 text-sm text-[var(--el-text-color-regular)]">
              {{ (row as AdminCommentItem).content }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              {{ fmtTime((row as AdminCommentItem).createdAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              size="small"
              :disabled="busyId === row.id"
              @click="remove(row as AdminCommentItem)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的评论" :image-size="80" />
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
