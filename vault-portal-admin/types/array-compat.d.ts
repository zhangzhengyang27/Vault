/**
 * 兼容性补丁：
 * 模板代码存在 `const arr = []; arr.push(anyValue)` 的写法（如
 * src/router/index.ts 的静态路由收集）。在 noImplicitAny 关闭时，
 * 这类数组会被推断为 never[] 导致 push 报错；这里为 Array#push
 * 追加一个宽化的重载（仅类型层面，不影响运行时）。
 */
interface Array<T> {
  /**
   * Appends new elements to the end of an array, and returns the new length.
   */
  push(...items: any[]): number;
}
