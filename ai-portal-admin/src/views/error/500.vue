<script setup lang="ts">
import { useRouter } from "vue-router";

defineOptions({
  name: "Error500"
});

const router = useRouter();
</script>

<template>
  <div class="flex h-screen w-full items-center justify-center">
    <el-result
      icon="error"
      title="500"
      sub-title="抱歉，服务器出错了"
    >
      <template #extra>
        <el-button type="primary" @click="router.push('/')">
          返回首页
        </el-button>
        <el-button @click="router.push('/login')">重新登录</el-button>
      </template>
    </el-result>
  </div>
</template>
