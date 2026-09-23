import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SearchService } from "./search.service";
import { Tool } from "../../entities/tool.entity";
import { Prompt } from "../../entities/prompt.entity";
import { Article } from "../../entities/article.entity";
import { News } from "../../entities/news.entity";
import { Repo } from "../../entities/repo.entity";
import { Mcp } from "../../entities/mcp.entity";
import { Resource } from "../../entities/resource.entity";

describe("SearchService", () => {
  let service: SearchService;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Tool), useValue: mockRepo },
        { provide: getRepositoryToken(Prompt), useValue: mockRepo },
        { provide: getRepositoryToken(Article), useValue: mockRepo },
        { provide: getRepositoryToken(News), useValue: mockRepo },
        { provide: getRepositoryToken(Repo), useValue: mockRepo },
        { provide: getRepositoryToken(Mcp), useValue: mockRepo },
        { provide: getRepositoryToken(Resource), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return empty array for empty query", async () => {
    const result = await service.search("");
    expect(result).toEqual([]);
  });

  it("should return empty array for query shorter than 2 chars", async () => {
    const result = await service.search("a");
    expect(result).toEqual([]);
  });

  it("should call queryBuilder for each table", async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([]);
    await service.search("chat");
    // 7 张表 + mcps 表拆出 MCP/Skill 两次查询 = 8
    expect(mockRepo.createQueryBuilder).toHaveBeenCalledTimes(8);
  });

  it("should split the mcps table into separate mcp and skill queries", async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([]);
    await service.search("pdf");
    const whereSqls = (
      mockQueryBuilder.andWhere.mock.calls as unknown as string[][]
    ).map((c) => c[0]);
    // mcps 表按 type 列分流，两类结果分别路由到 /mcp 与 /skills
    expect(whereSqls).toContain("mcp.type = :mcp_type");
    expect(
      whereSqls.filter((sql) => sql === "mcp.type = :mcp_type").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("should return results with correct format", async () => {
    mockQueryBuilder.getRawMany
      .mockResolvedValueOnce([
        {
          tool_slug: "chatgpt",
          tool_name: "ChatGPT",
          tool_description: "AI助手",
          sim: 0.8,
        },
      ])
      .mockResolvedValue([]) // prompts
      .mockResolvedValue([]) // articles
      .mockResolvedValue([]) // news
      .mockResolvedValue([]) // repos
      .mockResolvedValue([]) // mcps
      .mockResolvedValue([]); // resources

    const result = await service.search("chat");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "工具",
      name: "ChatGPT",
      desc: "AI助手",
      slug: "chatgpt",
      href: "/tools/chatgpt",
    });
  });

  it("should sort results by similarity descending", async () => {
    mockQueryBuilder.getRawMany
      .mockResolvedValueOnce([
        {
          tool_slug: "low",
          tool_name: "Low",
          tool_description: "低相似度",
          sim: 0.2,
        },
      ])
      .mockResolvedValueOnce([
        {
          prompt_slug: "high",
          prompt_title: "High",
          prompt_description: "高相似度",
          sim: 0.9,
        },
      ])
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([]);

    const result = await service.search("test");
    expect(result[0].name).toBe("High");
    expect(result[1].name).toBe("Low");
  });

  it("should limit results to 50", async () => {
    const manyResults = Array.from({ length: 60 }, (_, i) => ({
      tool_slug: `tool-${i}`,
      tool_name: `Tool ${i}`,
      tool_description: `desc ${i}`,
      sim: 0.5 - i * 0.001,
    }));
    mockQueryBuilder.getRawMany
      .mockResolvedValueOnce(manyResults)
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([])
      .mockResolvedValue([]);

    const result = await service.search("test");
    expect(result).toHaveLength(50);
  });
});
