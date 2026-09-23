import { ref } from "vue";

/** 页面强制刷新计数：TagsBar 刷新按钮自增，layout 的 router-view :key 追加它实现重挂载 */
export const refreshTick = ref(0);
