import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, QueryFailedError } from "typeorm";
import { CommentsService } from "./comments.service";
import { Comment } from "../../entities/comment.entity";
import { CommentLike } from "../../entities/comment-like.entity";
import { Post } from "../../entities/post.entity";
import { NotificationsService } from "../notifications/notifications.service";

describe("CommentsService（P1 回归）", () => {
  let service: CommentsService;
  let commentRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    increment: jest.Mock;
    decrement: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
  };
  let likeRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
  };
  let postRepo: { findOne: jest.Mock; increment: jest.Mock };
  let notifications: { createForUser: jest.Mock };

  beforeEach(async () => {
    commentRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      increment: jest.fn().mockResolvedValue({}),
      decrement: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((dto: object) => dto),
    };
    likeRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto: object) => dto),
    };
    postRepo = {
      findOne: jest.fn(),
      increment: jest.fn().mockResolvedValue({}),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: commentRepo },
        { provide: getRepositoryToken(CommentLike), useValue: likeRepo },
        { provide: getRepositoryToken(Post), useValue: postRepo },
        // create/remove 经 dataSource.getRepository(Post) 访问帖子仓储
        { provide: DataSource, useValue: { getRepository: () => postRepo } },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(CommentsService);
  });

  describe("toggleLike", () => {
    const comment = {
      id: 5,
      likes: 3,
      targetType: "post",
      targetId: 1,
      content: "x",
      user: { id: 2 },
    };

    it("23505 命中（并发双击）时不重复 increment，防止计数漂移", async () => {
      commentRepo.findOne.mockResolvedValue(comment);
      likeRepo.findOne.mockResolvedValue(null);
      likeRepo.save.mockRejectedValue(
        Object.assign(
          new QueryFailedError("", [], new Error("duplicate key")),
          {
            code: "23505",
          },
        ),
      );

      const result = await service.toggleLike(5, { id: 1, username: "bob" });

      expect(result).toEqual({ liked: true, likes: 4 });
      expect(commentRepo.increment).not.toHaveBeenCalled();
      // 通知由先到的请求发出，本请求不应重复发
      expect(notifications.createForUser).not.toHaveBeenCalled();
    });

    it("正常点赞：插入 + increment + 通知评论作者", async () => {
      commentRepo.findOne.mockResolvedValue(comment);
      likeRepo.findOne.mockResolvedValue(null);
      likeRepo.save.mockResolvedValue({});

      const result = await service.toggleLike(5, { id: 1, username: "bob" });

      expect(result).toEqual({ liked: true, likes: 4 });
      expect(commentRepo.increment).toHaveBeenCalledWith({ id: 5 }, "likes", 1);
      expect(notifications.createForUser).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          type: "like",
          targetType: "post",
          targetId: 1,
        }),
      );
    });
  });

  describe("嵌套回复", () => {
    it("可回复存量评论（post_id=null 仅写 target 列的历史数据）", async () => {
      postRepo.findOne.mockResolvedValue({
        id: 1,
        title: "T",
        status: "published",
        user: { id: 9 },
      });
      // 存量行：postId 为 null，仅 target_type/target_id 有值
      commentRepo.findOne.mockResolvedValue({
        id: 7,
        postId: null,
        targetType: "post",
        targetId: 1,
        parentId: null,
        user: { id: 2 },
      });
      commentRepo.save.mockImplementation((dto: object) =>
        Promise.resolve({ id: 99, ...dto }),
      );

      const saved = await service.create(
        1,
        { content: "hi", parentId: 7 },
        { id: 1, username: "bob" },
      );

      expect(saved.parentId).toBe(7);
      expect(notifications.createForUser).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          type: "comment",
          title: "bob 回复了你的评论",
        }),
      );
    });

    it("回复楼中楼的回复被拒（仅支持一级嵌套）", async () => {
      postRepo.findOne.mockResolvedValue({
        id: 1,
        title: "T",
        status: "published",
        user: { id: 9 },
      });
      commentRepo.findOne.mockResolvedValue({
        id: 8,
        postId: 1,
        targetType: "post",
        targetId: 1,
        parentId: 7,
        user: { id: 2 },
      });

      await expect(
        service.create(
          1,
          { content: "hi", parentId: 8 },
          {
            id: 1,
            username: "bob",
          },
        ),
      ).rejects.toThrow("仅支持对顶级评论回复");
    });
  });

  describe("findByPost", () => {
    it("剥离 user 关联只透出 userId（删除权限判断用）", async () => {
      commentRepo.find.mockResolvedValue([
        { id: 1, authorName: "a", user: { id: 9 } },
      ] as never);

      const rows = await service.findByPost(1);

      expect(rows[0]).toMatchObject({ id: 1, userId: 9 });
      expect(rows[0].user).toBeUndefined();
    });
  });
});
