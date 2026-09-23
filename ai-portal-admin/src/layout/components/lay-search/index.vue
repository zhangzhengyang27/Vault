<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Search } from "@element-plus/icons-vue";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { useRenderIcon } from "@/components/ReIcon/hooks";

defineOptions({
  name: "LaySearch"
});

const router = useRouter();
const keyword = ref("");
const visible = ref(false);

interface MenuItem {
  path: string;
  title: string;
  icon: unknown;
}

/** 展平菜单树，供搜索 */
const allMenus = computed<MenuItem[]>(() => {
  const result: MenuItem[] = [];
  const walk = (menus: any[]) => {
    menus.forEach(item => {
      if (item.children?.length) {
        walk(item.children);
      } else if (item.path) {
        result.push({
          path: item.path,
          title: item.meta?.title ?? item.path,
          icon: item.meta?.icon
        });
      }
    });
  };
  walk(usePermissionStoreHook().wholeMenus);
  return result;
});

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return allMenus.value.slice(0, 12);
  return allMenus.value
    .filter(item => item.title.toLowerCase().includes(kw))
    .slice(0, 12);
});

function go(item: MenuItem) {
  visible.value = false;
  keyword.value = "";
  router.push(item.path);
}
</script>

<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom"
    :width="320"
    trigger="click"
    popper-class="lay-search-popper"
  >
    <template #reference>
      <span
        class="cursor-pointer navbar-bg-hover select-none px-1.5"
        title="菜单搜索"
        @click="visible = !visible"
      >
        <el-icon :size="18"><Search /></el-icon>
      </span>
    </template>
    <el-input
      v-model="keyword"
      placeholder="搜索菜单…"
      clearable
      :prefix-icon="Search"
    />
    <div class="mt-2 max-h-72 overflow-y-auto">
      <div
        v-for="item in filtered"
        :key="item.path"
        class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--el-fill-color-light)]"
        @click="go(item)"
      >
        <el-icon :size="16">
          <component :is="useRenderIcon(item.icon)" />
        </el-icon>
        <span>{{ item.title }}</span>
      </div>
      <el-empty
        v-if="filtered.length === 0"
        description="没有匹配的菜单"
        :image-size="60"
      />
    </div>
  </el-popover>
</template>
