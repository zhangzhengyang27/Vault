import { computed } from "vue";
import { useRouter } from "vue-router";
import avatarDefault from "@/assets/svg/avatar.svg";
import { logoutApi } from "@/api/user";
import { useAppStoreHook } from "@/store/modules/app";
import { useUserStoreHook } from "@/store/modules/user";
import { getConfig } from "@/config";
import { getLayoutStorage } from "@/utils/responsive";

/**
 * 导航栏/登录页共用的导航逻辑。
 * lay-navbar 使用：layout, device, logout, onPanel, pureApp, username,
 * userAvatar, avatarsStyle, toggleSideBar, toAccountSettings
 * 登录页使用：title
 */
export function useNav() {
  const router = useRouter();
  const pureApp = useAppStoreHook();
  const userStore = useUserStoreHook();

  /** 布局模式（platform-config.json 的 Layout，本后台为 vertical） */
  const layout = computed(() => getLayoutStorage().layout);

  /** 设备类型 */
  const device = computed(() => pureApp.device);

  /** 站点标题 */
  const title = computed(() => getConfig().Title || "后台管理系统");

  /** 当前用户名 */
  const username = computed(
    () => userStore.username || userStore.nickname || ""
  );

  /** 用户头像（后端暂无头像，使用默认图） */
  const userAvatar = computed(() => userStore.avatar || avatarDefault);

  /** 头像样式 */
  const avatarsStyle = {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    display: "block",
    objectFit: "cover" as const
  };

  /** 折叠/展开侧边栏 */
  function toggleSideBar() {
    pureApp.toggleSideBar();
  }

  /** 退出登录：先调用后端撤销，再走本地清理（不等待结果） */
  function logout() {
    logoutApi().catch(() => undefined);
    userStore.logOut();
  }

  /** 打开系统配置面板（精简版：本后台未做配置面板，提示即可） */
  function onPanel() {
    // 精简实现：无右侧系统配置抽屉
  }

  /** 进入账户设置 */
  function toAccountSettings() {
    router.push("/account-settings");
  }

  return {
    layout,
    device,
    logout,
    onPanel,
    pureApp,
    username,
    userAvatar,
    avatarsStyle,
    toggleSideBar,
    toAccountSettings,
    title
  };
}
