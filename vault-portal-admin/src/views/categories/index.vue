<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  errMsg,
  type Category
} from "@/api/admin";

defineOptions({ name: "Categories" });

const items = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const busyId = ref<number | null>(null);

const editorOpen = ref(false);
const editing = ref<Category | null>(null);
const form = reactive<{ slug: string; name: string; parentId: number | string; sortOrder: number }>({
  slug: "",
  name: "",
  parentId: "",
  sortOrder: 0
});

const parentOptions = computed(() =>
  items.value.filter(c => c.id !== editing.value?.id)
);

const nameOf = (id: number | null) =>
  id == null ? null : items.value.find(c => c.id === id)?.name ?? `#${id}`;

async function load() {
  loading.value = true;
  try {
    const data = await getCategories();
    items.value = Array.isArray(data) ? data : [];
  } catch (e) {
    message(errMsg(e, "加载失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  Object.assign(form, { slug: "", name: "", parentId: "", sortOrder: 0 });
  editorOpen.value = true;
}

function openEdit(c: Category) {
  editing.value = c;
  Object.assign(form, {
    slug: c.slug,
    name: c.name,
    parentId: c.parentId ?? "",
    sortOrder: c.sortOrder
  });
  editorOpen.value = true;
}

async function save() {
  if (!form.name.trim() || !form.slug.trim()) {
    message("请填写名称和 Slug", { type: "warning" });
    return;
  }
  saving.value = true;
  try {
    const body = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      parentId: form.parentId === "" ? null : Number(form.parentId),
      sortOrder: Number(form.sortOrder) || 0
    };
    if (editing.value) {
      await updateCategory(editing.value.id, body);
      message("保存成功", { type: "success" });
    } else {
      await createCategory(body);
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

async function remove(c: Category) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${c.name}」吗？`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }
  busyId.value = c.id;
  try {
    await deleteCategory(c.id);
    message("已删除", { type: "success" });
    await load();
  } catch (e) {
    message(errMsg(e, "删除失败"), { type: "error" });
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">分类管理</h2>
        <p class="mt-1 text-sm text-gray-400">
          维护站点栏目与分类体系，支持上下级与排序。
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增分类</el-button>
    </div>

    <el-card shadow="never" :body-style="{ padding: 0 }">
      <el-table v-loading="loading" :data="items" stripe style="width: 100%">
        <el-table-column label="名称" min-width="160">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ row.name }}</span>
              <el-tag v-if="row.parentId == null" size="small">一级</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Slug" min-width="140">
          <template #default="{ row }">
            <span class="text-gray-500">{{ row.slug }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上级分类" min-width="140">
          <template #default="{ row }">
            <span class="text-gray-500">{{ nameOf(row.parentId) ?? "—" }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="90" />
        <el-table-column label="操作" width="140" align="right" fixed="right">
          <template #default="{ row }">
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
          <el-empty description="暂无分类" :image-size="80" />
        </template>
      </el-table>
    </el-card>

    <el-dialog
      v-model="editorOpen"
      :title="editing ? '编辑分类' : '新增分类'"
      width="440px"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如 AI 工具" />
        </el-form-item>
        <el-form-item label="Slug" required>
          <el-input v-model="form.slug" placeholder="如 ai-tools" />
        </el-form-item>
        <el-form-item label="上级分类">
          <el-select v-model="form.parentId" class="w-full!" clearable>
            <el-option label="无（一级分类）" value="" />
            <el-option
              v-for="p in parentOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :value-on-clear="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
