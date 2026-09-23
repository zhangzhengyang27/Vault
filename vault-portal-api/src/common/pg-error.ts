import { QueryFailedError } from "typeorm";

/**
 * 判断是否为指定 SQLSTATE 的 PostgreSQL 错误。
 *
 * 用途：把 `catch` 捕获到的 unknown 收窄，替代 `(err as any).code === '23505'`
 * 这类断言式写法——后者会让 any 泄漏出去，触发 no-unsafe-member-access。
 *
 * 取码说明：TypeORM 的 QueryFailedError 在类型声明上只暴露 driverError，
 * 但运行时也会把驱动错误的属性（含 code）直接带出来，因此两种取法都兼容。
 *
 * 常见 SQLSTATE：
 * - 23505 唯一约束冲突（并发重复提交 / 双击点赞）
 * - 23503 外键约束冲突（仍有内容引用的分类被删）
 */
export function isPgErrorWithCode(err: unknown, code: string): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const direct = (err as unknown as { code?: string }).code;
  const viaDriver = (err as unknown as { driverError?: { code?: string } })
    .driverError?.code;
  return direct === code || viaDriver === code;
}
