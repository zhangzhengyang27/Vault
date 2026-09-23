import { defineComponent, h, markRaw } from "vue";
import type { Component } from "vue";
import { Icon } from "@iconify/vue";
import "./offline";

/**
 * 渲染图标（与模板约定一致）：
 * - 字符串（"ep:user"、"ri:xxx"）→ iconify 离线图标
 * - 组件（@element-plus/icons-vue、svg ?component 导入）→ 原样返回
 */
export function useRenderIcon(icon?: unknown): Component {
  if (typeof icon === "string" && icon) {
    const name = icon;
    return markRaw(
      defineComponent({
        name: "IconifyIcon",
        render() {
          return h(Icon, {
            icon: name,
            width: "1em",
            height: "1em",
            style: { display: "inline-block", verticalAlign: "-0.125em" }
          });
        }
      })
    );
  }
  if (icon) {
    return markRaw(icon as Component);
  }
  return markRaw(
    defineComponent({
      name: "EmptyIcon",
      render: () => null
    })
  );
}
