<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { Loading } from "@element-plus/icons-vue";

defineOptions({
  name: "Redirect"
});

const route = useRoute();
const router = useRouter();

// 与模板一致：进入 /redirect/:path 立即跳回目标页（用于刷新当前页签）
router.replace({
  path: "/" + (route.params.path as string ?? ""),
  query: route.query
});
</script>

<template>
  <div class="flex h-full w-full items-center justify-center">
    <el-icon class="is-loading" :size="24"><Loading /></el-icon>
  </div>
</template>
