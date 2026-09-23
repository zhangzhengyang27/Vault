import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';

describe('MessagesService', () => {
  let service: MessagesService;
  let repo: {
    save: jest.Mock;
    query: jest.Mock;
    update: jest.Mock;
    findAndCount: jest.Mock;
    count: jest.Mock;
  };
  let userRepo: { findOne: jest.Mock; find: jest.Mock };

  const receiver = { id: 2, username: 'alice', status: 'active' } as User;
  const me = { id: 1, username: 'bob' };

  beforeEach(async () => {
    repo = {
      save: jest.fn((m: object) =>
        Promise.resolve({ id: 9, read: false, ...m }),
      ),
      create: jest.fn((dto: object) => dto),
      query: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
    };
    userRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: repo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = moduleRef.get(MessagesService);
  });

  describe('send', () => {
    it('正常发送：stripHtml 后入库', async () => {
      userRepo.findOne.mockResolvedValue(receiver);

      const result = await service.send(
        me,
        'alice',
        '<b>你好</b><script>x</script>',
      );

      expect(result).toMatchObject({
        senderId: 1,
        receiverId: 2,
        content: '你好',
      });
      expect(repo.save).toHaveBeenCalled();
    });

    it('不能给自己发私信', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'bob',
        status: 'active',
      });
      await expect(service.send(me, 'bob', 'hi')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('收件人不存在 404', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.send(me, 'ghost', 'hi')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('封禁用户不可收私信', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 3,
        username: 'banned',
        status: 'banned',
      });
      await expect(service.send(me, 'banned', 'hi')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('内容剥离后为空 400', async () => {
      userRepo.findOne.mockResolvedValue(receiver);
      await expect(
        service.send(me, 'alice', '<script>x</script>'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('chat', () => {
    it('拉取即已读：把对方发来的未读消息置为已读', async () => {
      userRepo.findOne.mockResolvedValue(receiver);
      repo.findAndCount.mockResolvedValue([
        [
          {
            id: 5,
            senderId: 2,
            receiverId: 1,
            content: 'hi',
            read: false,
            createdAt: new Date(),
          },
        ],
        1,
      ]);

      const result = await service.chat(1, 'alice');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repo.update).toHaveBeenCalledWith(
        { senderId: 2, receiverId: 1, read: false },
        { read: true },
      );
    });
  });

  describe('unreadTotal', () => {
    it('统计发给我的未读数', async () => {
      repo.count.mockResolvedValue(3);
      expect(await service.unreadTotal(1)).toBe(3);
      expect(repo.count).toHaveBeenCalledWith({
        where: { receiverId: 1, read: false },
      });
    });
  });
});
