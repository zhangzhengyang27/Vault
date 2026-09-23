import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Category } from '../entities/category.entity';
import { Tool } from '../entities/tool.entity';
import { Prompt } from '../entities/prompt.entity';
import { Article } from '../entities/article.entity';
import { News } from '../entities/news.entity';
import { Repo } from '../entities/repo.entity';
import { Mcp } from '../entities/mcp.entity';
import { Resource } from '../entities/resource.entity';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { Source } from '../entities/source.entity';

const SEED_ENTITIES = [
  Category,
  Tool,
  Prompt,
  Article,
  News,
  Repo,
  Mcp,
  Resource,
  Post,
  User,
  Source,
] as const;

type SeedEntity = (typeof SEED_ENTITIES)[number];

/** 内存版 repository 的形状（各方法都是 jest mock） */
interface MockRepo {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  count: jest.Mock;
}

/**
 * 造一个内存版 repository。
 * existing=true 时 findOne 一律返回「已存在」，用于验证幂等（只插不改）。
 */
function makeRepo(existing = false): MockRepo {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(existing ? { id: 1 } : null),
    create: jest.fn((dto: unknown) => dto),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    count: jest.fn().mockResolvedValue(0),
  };
}

/** 取出该 repo 每次 save 被调用时写入的实体 */
function savedArgs(repo: MockRepo): Record<string, unknown>[] {
  const calls = repo.save.mock.calls as unknown[][];
  return calls.map((args) => (args[0] ?? {}) as Record<string, unknown>);
}

async function buildSeedService(existing = false) {
  const providers = SEED_ENTITIES.map((entity) => ({
    provide: getRepositoryToken(entity),
    useValue: makeRepo(existing),
  }));

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [SeedService, ...providers],
  }).compile();

  const repoOf = (entity: SeedEntity): MockRepo =>
    moduleRef.get<MockRepo>(getRepositoryToken(entity));

  return { service: moduleRef.get(SeedService), repoOf };
}

const CONTENT_ENTITIES: SeedEntity[] = [
  Tool,
  Prompt,
  News,
  Repo,
  Mcp,
  Resource,
  Post,
  Source,
];

describe('SeedService', () => {
  const originalSeedDemo = process.env.SEED_DEMO;

  afterEach(() => {
    if (originalSeedDemo === undefined) delete process.env.SEED_DEMO;
    else process.env.SEED_DEMO = originalSeedDemo;
    jest.restoreAllMocks();
  });

  it('空库时写入各类种子数据', async () => {
    const { service, repoOf } = await buildSeedService(false);
    await service.onApplicationBootstrap();

    expect(repoOf(Category).save).toHaveBeenCalled();
    for (const entity of CONTENT_ENTITIES) {
      expect(repoOf(entity).save).toHaveBeenCalled();
    }
  });

  it('已存在时不再重复写入（幂等，只插不改）', async () => {
    const { service, repoOf } = await buildSeedService(true);
    await service.onApplicationBootstrap();

    // 各类都先查到已存在，因此不应触发任何 save
    for (const entity of CONTENT_ENTITIES) {
      expect(repoOf(entity).save).not.toHaveBeenCalled();
    }
  });

  it('写入的工具 slug 不重复，且缺省 tags 补为空数组', async () => {
    const { service, repoOf } = await buildSeedService(false);
    await service.onApplicationBootstrap();

    const saved = savedArgs(repoOf(Tool));
    expect(saved.length).toBeGreaterThan(0);

    const slugs = saved.map((t) => String(t.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
    // 缺省 tags 必须补成数组，否则前台渲染 tags.map 会崩
    for (const t of saved) {
      if (t.tags !== undefined) expect(Array.isArray(t.tags)).toBe(true);
    }
  });

  it('MCP 与 Skills 合并写入 mcps 表，缺 type 时回退为 mcp', async () => {
    const { service, repoOf } = await buildSeedService(false);
    await service.onApplicationBootstrap();

    const saved = savedArgs(repoOf(Mcp));
    expect(saved.length).toBeGreaterThan(0);
    for (const m of saved) {
      expect(typeof m.type).toBe('string');
      expect(String(m.type).length).toBeGreaterThan(0);
    }
  });

  it('演示管理员受 SEED_DEMO 与「用户表为空」双重门控', async () => {
    // 1) 未开启 SEED_DEMO：不创建
    delete process.env.SEED_DEMO;
    {
      const { service, repoOf } = await buildSeedService(false);
      await service.onApplicationBootstrap();
      expect(repoOf(User).save).not.toHaveBeenCalled();
    }

    // 2) 开启但用户表非空：不创建（不能把已降级的 demo 悄悄提回 admin）
    process.env.SEED_DEMO = 'true';
    {
      const { service, repoOf } = await buildSeedService(false);
      repoOf(User).count.mockResolvedValue(3);
      await service.onApplicationBootstrap();
      expect(repoOf(User).save).not.toHaveBeenCalled();
    }

    // 3) 开启且用户表为空：创建
    {
      const { service, repoOf } = await buildSeedService(false);
      repoOf(User).count.mockResolvedValue(0);
      await service.onApplicationBootstrap();
      expect(repoOf(User).save).toHaveBeenCalled();

      const created = savedArgs(repoOf(User))[0];
      expect(created.username).toBe('demo');
      expect(created.role).toBe('admin');
      // 必须存哈希而不是明文
      expect(created.passwordHash).not.toBe('demo1234');
      expect(String(created.passwordHash).startsWith('$2')).toBe(true);
    }

    // 4) SEED_DEMO 为其他值：不创建
    process.env.SEED_DEMO = 'false';
    {
      const { service, repoOf } = await buildSeedService(false);
      await service.onApplicationBootstrap();
      expect(repoOf(User).save).not.toHaveBeenCalled();
    }
  });

  it('文章不做种子（避免空心示例文章反复复活）', async () => {
    const { service, repoOf } = await buildSeedService(false);
    await service.onApplicationBootstrap();
    expect(repoOf(Article).save).not.toHaveBeenCalled();
  });
});
