/**
 * 树处理工具（与模板约定的 buildHierarchyTree 签名保持一致）：
 * 为每个节点补充 `id`、`parentId`（children 引用不变），
 * 供 formatFlatteningRoutes / formatTwoStageRoutes 使用。
 */
export function buildHierarchyTree(
  rows: Array<any>,
  options?: {
    id?: string;
    parentId?: string;
  }
): Array<any> {
  const idKey = options?.id ?? "id";
  const parentKey = options?.parentId ?? "parentId";
  let seq = 0;

  const walk = (items: Array<any>, parentId: number) => {
    items.forEach(item => {
      item[idKey] = ++seq;
      item[parentKey] = parentId;
      if (Array.isArray(item.children) && item.children.length) {
        walk(item.children, item[idKey]);
      }
    });
  };

  walk(rows, 0);
  return rows;
}
