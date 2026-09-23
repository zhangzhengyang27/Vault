import { buildFixedLookup, type FixedLookupCallback } from './fixed-lookup';

/** 收集一次 lookup 调用的结果 */
function invoke(
  allowedIps: string[],
  opts: unknown,
): { err: NodeJS.ErrnoException | null; address: unknown; family?: number } {
  let captured: {
    err: NodeJS.ErrnoException | null;
    address: unknown;
    family?: number;
  } = { err: null, address: undefined };

  const lookup = buildFixedLookup(allowedIps);
  const cb: FixedLookupCallback = (err, address, family) => {
    captured = { err, address, family };
  };
  lookup('example.com', opts, cb);
  return captured;
}

describe('buildFixedLookup', () => {
  const ips = ['104.18.33.45', '172.64.154.211'];

  it('autoSelectFamily 场景（all: true）返回 [{address, family}] 数组', () => {
    // Node >= 20 默认以 { all: true } 调用 lookup，必须返回数组，
    // 否则会抛 "Invalid IP address: undefined"
    const { err, address } = invoke(ips, { hints: 1024, all: true });

    expect(err).toBeNull();
    expect(Array.isArray(address)).toBe(true);
    expect(address).toEqual([
      { address: '104.18.33.45', family: 4 },
      { address: '172.64.154.211', family: 4 },
    ]);
  });

  it('all 为 false 时返回字符串 + family', () => {
    const { err, address, family } = invoke(ips, { all: false });

    expect(err).toBeNull();
    expect(address).toBe('104.18.33.45');
    expect(family).toBe(4);
  });

  it('opts 缺失或为数字时走字符串分支（兼容旧调用形式）', () => {
    const missing = invoke(ips, undefined);
    expect(missing.address).toBe('104.18.33.45');
    expect(missing.family).toBe(4);

    const numeric = invoke(ips, 4);
    expect(numeric.address).toBe('104.18.33.45');
    expect(numeric.family).toBe(4);
  });

  it('正确识别 IPv6 的 family', () => {
    const { address, family } = invoke(['2606:4700::6812:212d'], {
      all: false,
    });

    expect(address).toBe('2606:4700::6812:212d');
    expect(family).toBe(6);

    const asArray = invoke(['2606:4700::6812:212d'], { all: true });
    expect(asArray.address).toEqual([
      { address: '2606:4700::6812:212d', family: 6 },
    ]);
  });

  it('数组结果中的每一项都带 address 与 family，满足 Node 的契约', () => {
    const { address } = invoke(ips, { all: true });

    for (const entry of address as { address: string; family: number }[]) {
      expect(typeof entry.address).toBe('string');
      expect([4, 6]).toContain(entry.family);
    }
  });
});
