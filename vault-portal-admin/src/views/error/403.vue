<script setup lang="ts">
import { useRouter } from "vue-router";

defineOptions({
  name: "Error403"
});

const router = useRouter();
</script>

<template>
  <div class="flex h-screen w-full items-center justify-center">
    <el-result
      icon="warning"
      title="403"
      sub-title="抱歉，你没有权限访问该页面"
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
