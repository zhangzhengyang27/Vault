import { addCollection } from "@iconify/vue";
import epIcons from "@iconify-json/ep/icons.json";
import riIcons from "@iconify-json/ri/icons.json";

/**
 * 离线图标集注册（内网后台不走 iconify 在线 CDN）：
 * - ep：Element Plus 图标集（菜单 meta.icon "ep:*"）
 * - ri：Remix 图标集（RiIconFn / 工具条按钮）
 * 引入本模块即完成注册（带副作用，供 ReIcon/hooks 与 RiIcon 引入）。
 */
addCollection(epIcons);
addCollection(riIcons);
