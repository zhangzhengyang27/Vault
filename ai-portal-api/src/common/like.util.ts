/**
 * 转义 LIKE/ILIKE 通配符：用户输入中的 % _ \ 按字面量匹配。
 * 不转义会破坏匹配语义（搜「50%_off」命中无关行），且纯通配符查询
 * 无法被 pg_trgm GIN 索引服务，会退化为全表扫描。
 */
export function escapeLike(input?: string | null): string {
  return (input ?? "").replace(/[\\%_]/g, "\\$&");
}

/** ILIKE 查询拼接用 ESCAPE 子句（运行时值为单个反斜杠，Postgres 标准字符串语义下合法） */
const BACKSLASH = String.fromCharCode(92); // 用码点构造，避免多层引号转义出错
export const LIKE_ESCAPE_SQL = " ESCAPE '" + BACKSLASH + "'";
