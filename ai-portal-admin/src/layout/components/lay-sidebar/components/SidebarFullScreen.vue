<script setup lang="ts">
import { FullScreen } from "@element-plus/icons-vue";

defineOptions({
  name: "LaySidebarFullScreen"
});

defineProps<{
  isActive?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle"): void;
}>();

/** 全屏/退出全屏 */
function onToggle() {
  emit("toggle");
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
</script>

<template>
  <span
    class="cursor-pointer navbar-bg-hover select-none px-1.5"
    title="全屏"
    @click="onToggle"
  >
    <el-icon :size="18"><FullScreen /></el-icon>
  </span>
</template>
