<script setup lang="ts">
import { computed, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Close, RefreshRight } from "@element-plus/icons-vue";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { refreshTick } from "@/utils/refresh-key";

defineOptions({ name: "LayTags" });

const route = useRoute();
const router = useRouter();
const multiTagsStore = useMultiTagsStoreHook();
const permissionStore = usePermissionStoreHook();

/** 顶级叶子路由注册名带 Layout 后缀，页签/缓存用的是内层页面名 */
function stripLayout(name: unknown): string {
  return typeof name === "string" ? name.replace(/Layout$/, "") : "";
}

const tags = computed(() => multiTagsStore.multiTags);
const activePath = computed(() => route.path);

watch(
  () => route.path,
  path => {
    if (path === "/login") {
      // 退出登录落地页：清空上一账号的页签
      multiTagsStore.clear();
      return;
    }
    multiTagsStore.handleTags("push", {
      path,
      name: stripLayout(route.name),
      meta: { ...(route.meta ?? {}) }
    });
  },
  { immediate: true }
);

function toTag(tag: { path: string }) {
  if (tag.path !== route.path) router.push(tag.path);
}

/** 重挂载当前页面；缓存页先移出 include 再恢复，确保拿到全新实例 */
async function refresh() {
  const name = stripLayout(route.name);
  if (name && route.meta?.keepAlive) {
    permissionStore.cacheOperate("delete", name);
    await nextTick();
    permissionStore.cacheOperate("add", name);
  }
  refreshTick.value++;
}

/** 关闭页签；关的是当前页时跳到相邻页签 */
function close(tag: { path: string; name?: string; meta?: Record<string, any> }) {
  const idx = multiTagsStore.multiTags.findIndex(t => t.path === tag.path);
  if (idx < 0) return;
  multiTagsStore.handleTags("delete", tag);
  if (tag.name && tag.meta?.keepAlive) {
    permissionStore.cacheOperate("delete", tag.name);
  }
  if (tag.path === route.path) {
    const rest = multiTagsStore.multiTags;
    const next = rest[idx - 1] ?? rest[idx];
    router.push(next?.path ?? "/welcome");
  }
}
</script>

<template>
  <div
    class="tags-bar flex items-center gap-1 border-b border-[var(--el-border-color-light)] bg-[var(--el-bg-color)] px-2"
  >
    <el-scrollbar class="min-w-0 flex-1">
      <div class="flex items-center gap-1 py-1.5">
        <span
          v-for="tag in tags"
          :key="tag.path"
          class="tag-item inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-transparent px-2.5 py-1 text-xs text-[var(--el-text-color-regular)] transition-colors"
          :class="{
            'is-active border-[var(--el-color-primary-light-7)] bg-[var(--el-color-primary-light-9)] text-[var(--el-color-primary)]': tag.path === activePath
          }"
          @click="toTag(tag)"
        >
          <span class="whitespace-nowrap">{{ tag.meta?.title ?? tag.path }}</span>
          <el-icon
            v-if="tag.path !== '/welcome'"
            class="tag-close rounded-full hover:bg-[var(--el-fill-color)]"
            :size="12"
            @click.stop="close(tag)"
          >
            <Close />
          </el-icon>
        </span>
      </div>
    </el-scrollbar>
    <el-tooltip content="刷新当前页面" placement="top">
      <el-icon
        class="shrink-0 cursor-pointer rounded p-1 text-[var(--el-text-color-secondary)] transition-colors hover:bg-[var(--el-fill-color)] hover:text-[var(--el-color-primary)]"
        :size="14"
        @click="refresh"
      >
        <RefreshRight />
      </el-icon>
    </el-tooltip>
  </div>
</template>

<style scoped>
.tags-bar {
  height: 38px;
  flex-shrink: 0;
}

.tag-item:hover {
  background: var(--el-fill-color-light);
}

.tag-item.is-active:hover {
  background: var(--el-color-primary-light-9);
}

.tag-close {
  padding: 1px;
  margin-left: 2px;
}
</style>
