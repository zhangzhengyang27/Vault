<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

defineOptions({
  name: "LaySidebarBreadCrumb"
});

const route = useRoute();

/** 从当前匹配路由生成面包屑 */
const crumbs = computed(() =>
  route.matched.filter(item => item?.meta?.title).map(item => ({
    title: item.meta.title as string,
    path: item.path
  }))
);
</script>

<template>
  <el-breadcrumb class="breadcrumb-container select-none" separator="/">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item
        v-for="item in crumbs"
        :key="item.path"
      >
        {{ item.title }}
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<style scoped lang="css">
.breadcrumb-container {
  display: flex;
  align-items: center;
  white-space: nowrap;
  margin-left: 12px;
}
</style>
