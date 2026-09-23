import { isIP } from "net";

export type FixedLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | { address: string; family: number }[],
  family?: number,
) => void;

/**
 * 构造一个「只返回已校验 IP」的 lookup 实现，用于堵住
 * 「校验时解析一次、真正请求时又被 DNS rebinding 到内网 IP」的 TOCTOU 窗口。
 *
 * 关键点：Node >= 20 默认开启 `autoSelectFamily`，会以 `{ all: true }` 调用
 * lookup 并要求回调返回 `[{ address, family }]` 数组。若沿用旧的
 * `cb(null, ip, family)` 字符串形式，Node 内部会拿到 undefined 并抛出
 * `Invalid IP address: undefined`，导致采集任务全部失败。这里同时兼容
 * 两种调用形式，保持「固定 IP 发请求」的防护语义不变。
 */
export function buildFixedLookup(allowedIps: string[]) {
  const list = allowedIps.map((address) => ({
    address,
    family: isIP(address),
  }));

  return (_hostname: string, opts: unknown, cb: FixedLookupCallback): void => {
    if (opts && typeof opts === "object" && (opts as { all?: boolean }).all) {
      cb(null, list);
      return;
    }
    cb(null, list[0].address, list[0].family);
  };
}
