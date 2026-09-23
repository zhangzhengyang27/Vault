<script setup lang="ts">
import { computed } from "vue";
import { getConfig } from "@/config";

defineOptions({
  name: "LaySidebarLogo"
});

const title = computed(() => getConfig().Title || "后台管理系统");
/** v 参数用于换 logo 后破坏浏览器缓存 */
const logo = new URL("/logo.svg?v=20260912", import.meta.url).href;
</script>

<template>
  <div class="sidebar-logo-container flex items-center gap-2 px-4">
    <img :src="logo" class="h-8 w-8" alt="logo" />
    <transition name="el-fade-in-linear">
      <h1
        v-if="getConfig().ShowLogo"
        class="truncate text-base font-semibold whitespace-nowrap"
      >
        {{ title }}
      </h1>
    </transition>
  </div>
</template>

<style scoped>
.sidebar-logo-container {
  height: 56px;
  width: 100%;
  background-color: var(--el-bg-color);
}
</style>
