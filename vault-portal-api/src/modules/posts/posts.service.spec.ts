import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { Post } from "../../entities/post.entity";
import { PostLike } from "../../entities/post-like.entity";
import { ContentCleanupService } from "../../common/content-cleanup.service";
import { NotificationsService } from "../notifications/notifications.service";
import { parseTypes } from "../notifications/notifications.controller";

describe("PostsService（P2/P3 回归）", () => {
  let service: PostsService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    increment: jest.Mock;
    create: jest.Mock;
  };
  let likeRepo: {
    find: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    create: jest.Mock;
  };

  const ownedPost = {
    id: 1,
    title: "T",
    content: "C",
    status: "published",
    user: { id: 2 },
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn((p: object) => Promise.resolve(p)),
      increment: jest.fn().mockResolvedValue({}),
      create: jest.fn((dto: object) => dto),
    };
    likeRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      delete: jest.fn(),
      create: jest.fn((dto: object) => dto),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repo },
        { provide: getRepositoryToken(PostLike), useValue: likeRepo },
        { provide: ContentCleanupService, useValue: { purge: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: { createForUser: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(PostsService);
  });

  describe("update 权限矩阵", () => {
    const dto = { title: "新标题", content: "新内容", tags: ["a"] };

    it("作者本人可编辑", async () => {
      repo.findOne.mockResolvedValue(ownedPost);
      const r = await service.update(1, dto, { id: 2 });
      expect(r).toEqual({ success: true });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: "新标题" }),
      );
    });

    it("非作者 403", async () => {
      repo.findOne.mockResolvedValue(ownedPost);
      await expect(service.update(1, dto, { id: 3 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("管理员可编辑他人帖子", async () => {
      repo.findOne.mockResolvedValue(ownedPost);
      const r = await service.update(1, dto, { id: 3, role: "admin" });
      expect(r).toEqual({ success: true });
    });

    it("匿名帖（user 为空）非管理员 403", async () => {
      repo.findOne.mockResolvedValue({ ...ownedPost, user: null });
      await expect(service.update(1, dto, { id: 2 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("帖子不存在 404", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, dto, { id: 2 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("normalizeTags", () => {
    const normalize = (tags?: string[]) =>
      (
        service as unknown as {
          normalizeTags: (t?: string[]) => string[] | null;
        }
      ).normalizeTags(tags);

    it("trim + 剔除逗号 + 去重", () => {
      expect(normalize([" AI编程 ", "AI编程", "a,b", ""])).toEqual([
        "AI编程",
        "ab",
      ]);
    });

    it("截断到 5 个", () => {
      expect(normalize(["1", "2", "3", "4", "5", "6"])?.length).toBe(5);
    });

    it("空数组 / 全空白返回 null", () => {
      expect(normalize([])).toBeNull();
      expect(normalize(["  ", ""])).toBeNull();
      expect(normalize(undefined)).toBeNull();
    });
  });

  describe("likedPostIds", () => {
    it("使用 IN 查询且只回传命中的帖子 id", async () => {
      likeRepo.find.mockResolvedValue([{ postId: 1 }, { postId: 3 }]);

      const ids = await service.likedPostIds(9, [1, 2, 3]);

      expect(ids).toEqual([1, 3]);
      const expectedWhere = expect.objectContaining({
        user: { id: 9 },
      }) as unknown;
      expect(likeRepo.find).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it("空入参直接返回空数组（不触库）", async () => {
      expect(await service.likedPostIds(9, [])).toEqual([]);
      expect(likeRepo.find).not.toHaveBeenCalled();
    });
  });
});

describe("parseTypes（通知类型白名单）", () => {
  it("过滤非法类型并去空白", () => {
    expect(parseTypes("comment, like ,, hack")).toEqual(["comment", "like"]);
  });

  it("全非法输入返回空数组（不过滤语义）", () => {
    expect(parseTypes("hack,drop")).toEqual([]);
  });

  it("undefined 返回空数组", () => {
    expect(parseTypes(undefined)).toEqual([]);
  });
});
