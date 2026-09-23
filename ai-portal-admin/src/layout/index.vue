<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import LayNavbar from "@/layout/components/lay-navbar/index.vue";
import LayTags from "@/layout/components/lay-tags/index.vue";
import LaySidebarLogo from "@/layout/components/lay-sidebar/components/SidebarLogo.vue";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { useNav } from "@/layout/hooks/useNav";
import { useRenderIcon } from "@/components/ReIcon/hooks";
import { getConfig } from "@/config";
import { refreshTick } from "@/utils/refresh-key";

defineOptions({
  name: "Layout"
});

const route = useRoute();
const { pureApp } = useNav();
const permissionStore = usePermissionStoreHook();

/** 侧边栏菜单树（已按 rank 排序、过滤隐藏项） */
const menus = computed(() => permissionStore.wholeMenus);

/** keep-alive 缓存名单（页面组件名 = 路由名） */
const cacheList = computed(() => permissionStore.cachingPageList);

const sidebarOpened = computed(() => pureApp.sidebar.opened);

/** 当前激活菜单（子路由也高亮所属目录） */
const activeMenu = computed(() => route.path);
</script>

<template>
  <div class="app-wrapper flex h-full w-full">
    <!-- 侧边栏 -->
    <aside
      class="sidebar-container flex shrink-0 flex-col border-r border-[var(--el-border-color-light)] bg-[var(--el-bg-color)] transition-all duration-300"
      :class="sidebarOpened ? 'w-[210px]' : 'w-[64px]'"
    >
      <LaySidebarLogo v-if="getConfig().ShowLogo" class="shrink-0" />
      <el-scrollbar class="flex-1">
        <el-menu
          class="sidebar-menu border-r-0!"
          :default-active="activeMenu"
          :collapse="!sidebarOpened"
          :collapse-transition="false"
          router
        >
          <template v-for="item in menus" :key="item.path">
            <!-- 子目录 -->
            <el-sub-menu
              v-if="item.children?.length"
              :index="item.path"
              :popper-class="'sidebar-sub-menu'"
            >
              <template #title>
                <el-icon :size="17">
                  <component :is="useRenderIcon(item.meta?.icon)" />
                </el-icon>
                <span>{{ item.meta?.title }}</span>
              </template>
              <el-menu-item
                v-for="child in item.children"
                :key="child.path"
                :index="child.path"
              >
                <el-icon :size="16">
                  <component :is="useRenderIcon(child.meta?.icon)" />
                </el-icon>
                <template #title>{{ child.meta?.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <!-- 单级菜单 -->
            <el-menu-item v-else :index="item.path">
              <el-icon :size="17">
                <component :is="useRenderIcon(item.meta?.icon)" />
              </el-icon>
              <template #title>{{ item.meta?.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </aside>

    <!-- 主内容区 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <LayNavbar class="shrink-0" />
      <LayTags class="shrink-0" />

      <el-scrollbar class="min-h-0 flex-1">
        <main class="main-container">
          <router-view>
            <template #default="{ Component, route: viewRoute }">
              <KeepAlive :include="cacheList">
                <component
                  :is="Component"
                  :key="`${viewRoute.path}:${refreshTick}`"
                />
              </KeepAlive>
            </template>
          </router-view>
        </main>
      </el-scrollbar>
    </div>
  </div>
</template>

<style scoped>
.sidebar-container {
  height: 100%;
  overflow: hidden;
}

/* 折叠态隐藏菜单文字 */
.sidebar-menu:not(.el-menu--collapse) {
  width: 100%;
}

.navbar-container {
  position: sticky;
  top: 0;
  z-index: 10;
}

.main-container {
  min-height: calc(100vh - 94px);
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
