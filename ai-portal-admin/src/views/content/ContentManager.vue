<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getContentList,
  createContent,
  updateContent,
  deleteContent,
  getCategories,
  errMsg,
  type ContentItem,
  type Category
} from "@/api/admin";
import {
  STATUS_META,
  CONTENT_STATUSES,
  PORTAL_URL,
  type ContentTypeConfig,
  type FieldDef
} from "./configs";

const props = defineProps<{ config: ContentTypeConfig }>();

const LIMIT = 20;

const items = ref<ContentItem[]>([]);
const total = ref(0);
const page = ref(1);
const status = ref("all");
const search = ref("");
const searchInput = ref("");
const loading = ref(false);
const error = ref("");
const busyId = ref<number | null>(null);
const categories = ref<Category[]>([]);

const editorOpen = ref(false);
const editing = ref<ContentItem | null>(null);
const form = reactive<Record<string, unknown>>({});
const saving = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

const statusTabs = computed(() => [
  { value: "all", label: "全部" },
  ...CONTENT_STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))
]);

const categoryOptions = computed(() =>
  categories.value.map(c => ({ value: c.id, label: c.name }))
);

const detailHref = (item: ContentItem) =>
  props.config.detailPath.endsWith("/")
    ? `${PORTAL_URL}${props.config.detailPath}${encodeURIComponent(item.slug)}`
    : `${PORTAL_URL}${props.config.detailPath}`;

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getContentList(props.config.type, {
      page: page.value,
      limit: LIMIT,
      status: status.value,
      q: search.value
    });
    items.value = data.items ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    error.value = errMsg(e, "加载失败");
  } finally {
    loading.value = false;
  }
}

function onSearchInput(value: string) {
  searchInput.value = value;
  // 防抖 300ms，避免每个按键都请求一次后台
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    search.value = value;
    page.value = 1;
  }, 300);
}

function openCreate() {
  editing.value = null;
  Object.keys(form).forEach(k => delete form[k]);
  form.status = "published";
  editorOpen.value = true;
}

function openEdit(item: ContentItem) {
  editing.value = item;
  Object.keys(form).forEach(k => delete form[k]);
  form.status = item.status ?? "published";
  for (const field of props.config.fields) {
    if (item[field.key] !== undefined) form[field.key] = item[field.key];
    else if (field.type === "boolean") form[field.key] = false;
  }
  editorOpen.value = true;
}

async function save() {
  const titleValue = form[props.config.titleField];
  if (!titleValue || !String(titleValue).trim()) {
    message("请填写标题", { type: "warning" });
    return;
  }
  saving.value = true;
  try {
    const body: Record<string, unknown> = { ...form };
    // categoryId：下拉框值为字符串时转 number，空值表示清空分类
    if (body.categoryId !== undefined) {
      body.categoryId =
        body.categoryId === "" || body.categoryId === null
          ? null
          : Number(body.categoryId);
    }
    // tags：逗号分隔字符串转数组
    for (const field of props.config.fields) {
      const raw = body[field.key];
      if (field.type === "tags" && typeof raw === "string") {
        body[field.key] = raw
          .split(/[,，]/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    }
    if (editing.value) {
      await updateContent(props.config.type, editing.value.id, body);
      message("保存成功", { type: "success" });
    } else {
      await createContent(props.config.type, body);
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

async function remove(item: ContentItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${String(item[props.config.titleField])}」吗？此操作不可恢复。`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  busyId.value = item.id;
  try {
    await deleteContent(props.config.type, item.id);
    message("已删除", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "删除失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

async function toggleStatus(item: ContentItem, next: string) {
  busyId.value = item.id;
  try {
    await updateContent(props.config.type, item.id, { status: next });
    message(next === "published" ? "已发布" : "已下架（转草稿）", {
      type: "success"
    });
    await load();
  } catch (e) {
    message(errMsg(e, "操作失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

function fieldPlaceholder(field: FieldDef) {
  if (field.placeholder) return field.placeholder;
  if (field.type === "tags") return "多个标签用逗号分隔";
  return "";
}

function optionsOf(field: FieldDef) {
  return field.key === "categoryId" ? categoryOptions.value : field.options ?? [];
}

onMounted(async () => {
  await load();
  getCategories()
    .then(data => (categories.value = Array.isArray(data) ? data : []))
    .catch(() => (categories.value = []));
});

onBeforeUnmount(() => clearTimeout(searchTimer));

watch([status, search, page], () => load());
</script>

<template>
  <div class="p-5">
    <!-- 页头 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">{{ config.title }}</h2>
        <p class="mt-1 text-sm text-gray-400">{{ config.description }}</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建</el-button>
    </div>

    <!-- 筛选栏 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <el-radio-group v-model="status" size="small">
        <el-radio-button
          v-for="t in statusTabs"
          :key="t.value"
          :value="t.value"
        >
          {{ t.label }}
        </el-radio-button>
      </el-radio-group>
      <el-input
        v-model="searchInput"
        class="w-56!"
        size="small"
        clearable
        placeholder="搜索标题…"
        :prefix-icon="null"
        @input="onSearchInput"
      />
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      class="mb-4"
      :closable="false"
    />

    <!-- 列表 -->
    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column
          :label="config.titleField === 'name' ? '名称' : '标题'"
          min-width="260"
        >
          <template #default="{ row }">
            <a
              :href="detailHref(row)"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium hover:text-blue-500"
            >
              {{ String(row[config.titleField] ?? "") }}
            </a>
          </template>
        </el-table-column>
        <el-table-column v-if="config.type !== 'news'" label="分类" width="140">
          <template #default="{ row }">
            <span class="text-gray-500">{{ row.category?.name ?? "—" }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="(STATUS_META[row.status ?? 'draft'] ?? STATUS_META.draft).type"
            >
              {{ (STATUS_META[row.status ?? "draft"] ?? STATUS_META.draft).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            <span class="text-xs text-gray-400">
              {{ row.createdAt ? new Date(row.createdAt).toLocaleString("zh-CN") : "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" align="right" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'published'"
              link
              type="success"
              size="small"
              :disabled="busyId === row.id"
              @click="toggleStatus(row, 'published')"
            >
              发布
            </el-button>
            <el-button
              v-if="row.status === 'published'"
              link
              type="warning"
              size="small"
              :disabled="busyId === row.id"
              @click="toggleStatus(row, 'draft')"
            >
              下架
            </el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="busyId === row.id"
              @click="remove(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的内容" :image-size="80" />
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

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="editorOpen"
      :title="`${editing ? '编辑' : '新建'}${config.title.replace('管理', '')}`"
      width="640px"
      destroy-on-close
    >
      <el-form label-position="top" class="max-h-[60vh] overflow-y-auto pr-1">
        <el-row :gutter="16">
          <el-col
            v-for="field in config.fields"
            :key="field.key"
            :span="field.full || field.type === 'textarea' ? 24 : 12"
          >
            <el-form-item :required="field.required" :label="field.label">
              <!-- 布尔 -->
              <el-checkbox
                v-if="field.type === 'boolean'"
                :model-value="!!form[field.key]"
                label="是"
                @update:model-value="form[field.key] = $event"
              />
              <!-- 数字 -->
              <el-input-number
                v-else-if="field.type === 'number'"
                :model-value="Number(form[field.key] ?? 0)"
                class="w-full!"
                :value-on-clear="0"
                @update:model-value="form[field.key] = $event"
              />
              <!-- 下拉（分类/状态等） -->
              <el-select
                v-else-if="field.type === 'select'"
                :model-value="(form[field.key] as string) ?? ''"
                class="w-full!"
                clearable
                filterable
                placeholder="请选择…"
                @update:model-value="form[field.key] = $event"
              >
                <el-option
                  v-for="o in optionsOf(field)"
                  :key="String(o.value)"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
              <!-- 多行文本 -->
              <el-input
                v-else-if="field.type === 'textarea'"
                :model-value="(form[field.key] as string) ?? ''"
                type="textarea"
                :rows="5"
                :placeholder="fieldPlaceholder(field)"
                @update:model-value="form[field.key] = $event"
              />
              <!-- 标签 / 单行文本 -->
              <el-input
                v-else
                :model-value="form[field.key] === undefined ? '' : String(form[field.key])"
                :placeholder="fieldPlaceholder(field)"
                @update:model-value="form[field.key] = $event"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editorOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
