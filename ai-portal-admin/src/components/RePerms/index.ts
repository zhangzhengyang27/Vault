import { defineComponent, type PropType } from "vue";
import { useUserStoreHook } from "@/store/modules/user";

/**
 * 按钮级权限组件（全局注册为 <Auth> / <Perms>）：
 * - <Auth value="btn_add">：按 permissions 校验（支持通配 *:*:*）
 * - <Perms value="admin">：按 roles 校验
 * 无权限时不渲染子内容。
 */
type AuthValue = string | Array<string>;

function hasAccess(value: AuthValue, owned: Array<string>): boolean {
  if (!owned?.length) return false;
  if (owned.includes("*:*:*")) return true;
  const list = Array.isArray(value) ? value : value ? [value] : [];
  if (!list.length) return owned.length > 0;
  return list.some(v => owned.includes(v));
}

export const Auth = defineComponent({
  name: "Auth",
  props: {
    value: {
      type: [String, Array] as PropType<AuthValue>,
      default: () => ""
    }
  },
  setup(props, { slots }) {
    return () =>
      hasAccess(props.value, useUserStoreHook().permissions ?? [])
        ? slots.default?.()
        : null;
  }
});

export const Perms = defineComponent({
  name: "Perms",
  props: {
    value: {
      type: [String, Array] as PropType<AuthValue>,
      default: () => []
    }
  },
  setup(props, { slots }) {
    return () =>
      hasAccess(props.value, useUserStoreHook().roles ?? [])
        ? slots.default?.()
        : null;
  }
});
