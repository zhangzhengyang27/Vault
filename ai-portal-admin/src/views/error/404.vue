<script setup lang="ts">
import { useRouter } from "vue-router";

defineOptions({
  name: "Error404"
});

const router = useRouter();
</script>

<template>
  <div class="flex h-screen w-full items-center justify-center">
    <el-result
      icon="info"
      title="404"
      sub-title="抱歉，你访问的页面不存在"
    >
      <template #extra>
        <el-button type="primary" @click="router.push('/')">
          返回首页
        </el-button>
        <el-button @click="router.back()">返回上一页</el-button>
      </template>
    </el-result>
  </div>
</template>
