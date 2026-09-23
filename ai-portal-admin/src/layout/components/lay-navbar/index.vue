<script setup lang="ts">
import { useNav } from "@/layout/hooks/useNav";
import LaySearch from "../lay-search/index.vue";
import LayNavMix from "../lay-sidebar/NavMix.vue";
import LaySidebarFullScreen from "../lay-sidebar/components/SidebarFullScreen.vue";
import LaySidebarBreadCrumb from "../lay-sidebar/components/SidebarBreadCrumb.vue";
import LaySidebarTopCollapse from "../lay-sidebar/components/SidebarTopCollapse.vue";

import { RiIconFn } from "@/components/ReIcon/RiIcon";

const AccountSettingsIcon = RiIconFn("user-settings-line");
const LogoutCircleRLine = RiIconFn("logout-circle-r-line");
const Setting = RiIconFn("settings-3-line");

const {
  layout,
  device,
  logout,
  onPanel,
  pureApp,
  username,
  userAvatar,
  avatarsStyle,
  toggleSideBar,
  toAccountSettings
} = useNav();
</script>

<template>
  <div class="navbar bg-surface/85 shadow-xs shadow-[rgba(0,21,41,0.08)] backdrop-blur-md backdrop-saturate-150">
    <LaySidebarTopCollapse
      v-if="device === 'mobile'"
      class="hamburger-container"
      :is-active="pureApp.sidebar.opened"
      @toggleClick="toggleSideBar"
    />

    <LaySidebarBreadCrumb
      v-if="layout !== 'mix' && device !== 'mobile'"
      class="breadcrumb-container"
    />

    <LayNavMix v-if="layout === 'mix'" />

    <div v-if="layout === 'vertical'" class="vertical-header-right">
      <!-- 菜单搜索 -->
      <LaySearch id="header-search" />
      <!-- 全屏 -->
      <LaySidebarFullScreen id="full-screen" />
      <!-- 退出登录 -->
      <el-dropdown trigger="click">
        <span class="el-dropdown-link navbar-bg-hover select-none">
          <img :src="userAvatar" :style="avatarsStyle" />
          <p v-if="username" class="dark:text-white">{{ username }}</p>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="logout">
            <el-dropdown-item @click="toAccountSettings">
              <component :is="AccountSettingsIcon" style="margin: 5px" />
              账户设置
            </el-dropdown-item>
            <el-dropdown-item @click="logout">
              <component :is="LogoutCircleRLine" style="margin: 5px" />
              退出系统
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span
        class="set-icon navbar-bg-hover hover:[&>svg]:animate-scale-bounce"
        title="打开系统配置"
        @click="onPanel"
      >
        <component :is="Setting" />
      </span>
    </div>
  </div>
</template>

<style scoped lang="css">
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  background-color: var(--el-bg-color);
}

.hamburger-container {
  line-height: 46px;
}

.breadcrumb-container {
  margin-left: 8px;
}

.vertical-header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 220px;
  gap: 10px;
  color: var(--el-text-color-primary);
}

.el-dropdown-link {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  cursor: pointer;
  color: var(--el-text-color-primary);
}

.el-dropdown-link img {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
}

.el-dropdown-link p {
  margin: 0;
  font-size: 14px;
}

.set-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 16px;
}

.navbar-bg-hover:hover {
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
