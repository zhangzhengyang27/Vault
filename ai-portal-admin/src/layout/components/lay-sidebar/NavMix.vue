<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import LaySidebarLogo from "./components/SidebarLogo.vue";

/**
 * 混合布局顶栏（NavMix）。
 * 本后台布局固定为 vertical（platform-config.json 的 Layout），
 * 此组件仅在 layout === "mix" 时渲染，保留占位以兼容模板结构。
 */
defineOptions({
  name: "NavMix"
});

const { layout } = useNav();
void layout;
</script>

<template>
  <div class="nav-mix-container">
    <LaySidebarLogo v-if="false" class="hidden" />
  </div>
</template>
