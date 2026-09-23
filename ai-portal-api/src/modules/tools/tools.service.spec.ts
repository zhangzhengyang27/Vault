import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ToolsService } from "./tools.service";
import { Tool } from "../../entities/tool.entity";
import { Category } from "../../entities/category.entity";
import { ContentCleanupService } from "../../common/content-cleanup.service";

describe("ToolsService", () => {
  let service: ToolsService;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const mockToolRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto: Record<string, unknown>) => dto),
    save: jest.fn((entity: Record<string, unknown>) => Promise.resolve(entity)),
  };

  const mockCategoryRepo = {
    findOneBy: jest.fn(),
  };

  const mockCleanup = {
    purge: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsService,
        { provide: getRepositoryToken(Tool), useValue: mockToolRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: ContentCleanupService, useValue: mockCleanup },
      ],
    }).compile();

    service = module.get<ToolsService>(ToolsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should filter by published status by default", async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    await service.findAll({});
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "tool.status = :status",
      { status: "published" },
    );
  });

  it("should return paginated result with correct format", async () => {
    const mockTools = [
      { id: 1, slug: "test", name: "Test", content: "full content" },
    ];
    mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTools, 1]);

    const result = await service.findAll({ page: 1, limit: 10 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 1);
    expect(result).toHaveProperty("page", 1);
    expect(result).toHaveProperty("limit", 10);
    expect(result).toHaveProperty("totalPages", 1);
  });

  it("should remove content field from list results", async () => {
    const mockTools = [
      {
        id: 1,
        slug: "test",
        name: "Test",
        content: "full content",
        description: "desc",
      },
    ];
    mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTools, 1]);

    const result = await service.findAll({});
    expect(result.items[0]).not.toHaveProperty("content");
    expect(result.items[0]).toHaveProperty("description");
  });

  it("should handle category filter", async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    await service.findAll({ category: "ai" });
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
  });

  it("should handle tag filter", async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    await service.findAll({ tag: "free" });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "tool.tags @> ARRAY[:tag]::text[]",
      { tag: "free" },
    );
  });

  it("should clamp page to minimum 1", async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    await service.findAll({ page: 0, limit: 10 });
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
  });

  it("should clamp limit to maximum 100", async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    await service.findAll({ page: 1, limit: 999 });
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
  });

  it("findOne should throw NotFoundException when not found or unpublished", async () => {
    mockToolRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne("nonexistent")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("findOne should not serve unpublished content", async () => {
    mockToolRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne("draft-slug")).rejects.toThrow(
      NotFoundException,
    );
    expect(mockToolRepo.findOne).toHaveBeenCalledWith({
      where: { slug: "draft-slug", status: "published" },
    });
  });
});
