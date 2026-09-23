import { defineComponent, h, markRaw } from "vue";
import { Icon } from "@iconify/vue";
import "./offline";

/**
 * Remix 图标工厂：RiIconFn("lock-fill") → 渲染 "ri:lock-fill" 的组件。
 * （离线数据由 @iconify-json/ri 提供，见 ./offline.ts）
 */
export function RiIconFn(name: string) {
  const icon = name.startsWith("ri:") ? name : `ri:${name}`;
  return markRaw(
    defineComponent({
      name: "RiIcon",
      render() {
        return h(Icon, {
          icon,
          width: "1em",
          height: "1em",
          style: { display: "inline-block", verticalAlign: "-0.125em" }
        });
      }
    })
  );
}
