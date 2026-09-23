<script setup lang="ts">
import { Expand, Fold } from "@element-plus/icons-vue";

defineOptions({
  name: "LaySidebarTopCollapse"
});

defineProps<{
  isActive: boolean;
}>();

const emit = defineEmits<{
  (e: "toggleClick"): void;
}>();
</script>

<template>
  <div
    class="hamburger-container cursor-pointer select-none px-2 leading-[46px]"
    title="折叠菜单"
    @click="emit('toggleClick')"
  >
    <el-icon :size="20">
      <Expand v-if="isActive" />
      <Fold v-else />
    </el-icon>
  </div>
</template>
