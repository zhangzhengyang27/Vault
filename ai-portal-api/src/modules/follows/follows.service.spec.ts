import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FollowsService } from './follows.service';
import { Follow } from '../../entities/follow.entity';
import { User } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('FollowsService', () => {
  let service: FollowsService;
  let followRepo: { insert: jest.Mock; delete: jest.Mock; findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let notifications: { createForUser: jest.Mock };

  const targetUser = { id: 2, username: 'alice', status: 'active' } as User;

  beforeEach(async () => {
    followRepo = {
      insert: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: getRepositoryToken(Follow), useValue: followRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(FollowsService);
  });

  it('follow: 成功关注并给被关注人发通知', async () => {
    userRepo.findOne.mockResolvedValue(targetUser);
    followRepo.insert.mockResolvedValue({});

    const result = await service.follow({ id: 1, username: 'bob' }, 'alice');

    expect(result).toEqual({ following: true });
    expect(followRepo.insert).toHaveBeenCalledWith({
      followerId: 1,
      followingId: 2,
    });
    expect(notifications.createForUser).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        type: 'follow',
        targetType: 'user',
        targetSlug: 'bob',
      }),
    );
  });

  it('follow: 重复关注幂等且不重复发通知', async () => {
    userRepo.findOne.mockResolvedValue(targetUser);
    // 模拟唯一约束冲突：isPgErrorWithCode 要求 QueryFailedError 实例 + code 属性
    followRepo.insert.mockRejectedValue(
      Object.assign(new QueryFailedError('', [], new Error('duplicate key')), {
        code: '23505',
      }),
    );

    const result = await service.follow({ id: 1, username: 'bob' }, 'alice');

    expect(result).toEqual({ following: true });
    expect(notifications.createForUser).not.toHaveBeenCalled();
  });

  it('follow: 不能关注自己', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 1,
      username: 'bob',
      status: 'active',
    });
    await expect(
      service.follow({ id: 1, username: 'bob' }, 'bob'),
    ).rejects.toThrow(BadRequestException);
  });

  it('follow: 封禁用户不可被关注', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 3,
      username: 'banned',
      status: 'banned',
    });
    await expect(
      service.follow({ id: 1, username: 'bob' }, 'banned'),
    ).rejects.toThrow(NotFoundException);
  });

  it('follow: 目标用户不存在抛 404', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(
      service.follow({ id: 1, username: 'bob' }, 'ghost'),
    ).rejects.toThrow(NotFoundException);
  });

  it('unfollow: 删除关系并返回未关注', async () => {
    userRepo.findOne.mockResolvedValue(targetUser);
    followRepo.delete.mockResolvedValue({ affected: 1 });

    const result = await service.unfollow(1, 'alice');

    expect(result).toEqual({ following: false });
    expect(followRepo.delete).toHaveBeenCalledWith({
      followerId: 1,
      followingId: 2,
    });
  });

  it('isFollowing: 返回关注状态', async () => {
    userRepo.findOne.mockResolvedValue(targetUser);
    followRepo.findOne.mockResolvedValue({ id: 9 });
    expect(await service.isFollowing(1, 'alice')).toEqual({ following: true });
    followRepo.findOne.mockResolvedValue(null);
    expect(await service.isFollowing(1, 'alice')).toEqual({ following: false });
  });
});
