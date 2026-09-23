import { createServer, type Server } from 'http';
import { Agent as HttpAgent, request as httpRequest } from 'http';
import { buildFixedLookup } from './fixed-lookup';

/**
 * 集成验证：用「固定 IP 的 lookup」真正发起一次 HTTP 请求。
 *
 * 单元测试只能证明回调契约正确；这里补上端到端证据——因为原始缺陷
 * （`Invalid IP address: undefined`）只在 Node 的 Agent → net 内部真正
 * 调用 lookup 时才暴露，光测回调函数是发现不了的。
 */
describe('buildFixedLookup 集成验证', () => {
  let server: Server;
  let port = 0;

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('feed-ok');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('能真正完成 HTTP 请求，且确实走了 autoSelectFamily 的 all:true 分支', async () => {
    const seenOpts: unknown[] = [];
    const inner = buildFixedLookup(['127.0.0.1']);

    const agent = new HttpAgent({
      lookup: (hostname: string, opts: unknown, cb: never) => {
        seenOpts.push(opts);
        return inner(hostname, opts, cb);
      },
    });

    const body = await new Promise<string>((resolve, reject) => {
      const req = httpRequest(
        // host 故意写成 localhost，lookup 会把它固定到 127.0.0.1
        { host: 'localhost', port, path: '/feed.xml', agent, timeout: 5000 },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        },
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.end();
    });

    expect(body).toBe('feed-ok');
    // 断言真的覆盖到了出问题的分支：Node >= 20 会以 { all: true } 调用 lookup
    expect(seenOpts.length).toBeGreaterThan(0);
    expect(
      seenOpts.some((o) => (o as { all?: boolean } | undefined)?.all === true),
    ).toBe(true);
  });

  it('回归护栏：旧的「只返回字符串」写法在同样的请求下会失败', async () => {
    // 这一段刻意保留有缺陷的实现，用来证明上面的集成测试确实能捕获该缺陷。
    // 若未来 Node 调整了 autoSelectFamily 的行为导致此用例失败，
    // 说明该分支的契约变了，需要重新评估 fixed-lookup 的实现。
    const legacyAgent = new HttpAgent({
      lookup: (
        _hostname: string,
        _opts: unknown,
        cb: (err: Error | null, address: string, family: number) => void,
      ) => {
        cb(null, '127.0.0.1', 4);
      },
    });

    await expect(
      new Promise((resolve, reject) => {
        const req = httpRequest(
          {
            host: 'localhost',
            port,
            path: '/',
            agent: legacyAgent,
            timeout: 5000,
          },
          (res) => {
            res.resume();
            resolve('ok');
          },
        );
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
        req.end();
      }),
    ).rejects.toThrow(/Invalid IP address/);
  });
});
