import { store } from "./index";
import router, { resetRouter } from "@/router";
import { storageLocal } from "@pureadmin/utils";

/** 用户 store 的状态类型 */
export type userType = {
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 页面级别权限 */
  roles: Array<string>;
  /** 按钮级别权限 */
  permissions: Array<string>;
  /** 判断登录页面显示哪个组件 */
  currentPage: number;
  /** 登录页是否勾选免登录 */
  isRemembered: boolean;
  /** 免登录存储天数 */
  loginDay: number;
};

/** 退出登录后重置的初始标签页集合 */
export const routerArrays: Array<{
  path: string;
  name: string;
  meta: Record<string, unknown>;
}> = [
  {
    path: "/",
    name: "Home",
    meta: {
      title: "首页",
      icon: "ep:home-filled"
    }
  }
];

export { store, router, resetRouter, storageLocal };
