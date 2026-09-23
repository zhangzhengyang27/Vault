import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Message } from "../../entities/message.entity";
import { User } from "../../entities/user.entity";
import { clampInt } from "../posts/posts.service";

/** 会话联系人/对话对方的公开信息（不含 email/passwordHash） */
function toPublicUser(u: User) {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatar: u.avatar,
    role: u.role,
  };
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async findActiveUser(username: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    // 封禁用户对私信体系不可见
    if (!user || user.status !== "active") {
      throw new NotFoundException("用户不存在");
    }
    return user;
  }

  async send(
    sender: { id: number; username: string },
    toUsername: string,
    rawContent: string,
  ) {
    const receiver = await this.findActiveUser(toUsername);
    if (receiver.id === sender.id) {
      throw new BadRequestException("不能给自己发私信");
    }
    // 与帖子/评论同一套防存储型 XSS 处理
    const content = rawContent
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<\/?(script|iframe|object|embed|form)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!content) {
      throw new BadRequestException("私信内容不能为空");
    }
    return this.repo.save(
      this.repo.create({
        senderId: sender.id,
        receiverId: receiver.id,
        content,
      }),
    );
  }

  /** 未读总数（铃铛徽章/消息 tab 徽章用） */
  async unreadTotal(meId: number) {
    return this.repo.count({ where: { receiverId: meId, read: false } });
  }

  /**
   * 会话列表：每段关系取最新一条（DISTINCT ON）+ 未读数 + 联系人公开信息，
   * 按最后消息时间倒序。
   */
  async conversations(meId: number) {
    const rows: Array<{
      partner: number;
      last_id: number;
      last_content: string;
      last_sender_id: number;
      last_created_at: string;
    }> = await this.repo.query(
      `SELECT DISTINCT ON (partner) partner, id AS last_id, content AS last_content,
              sender_id AS last_sender_id, created_at AS last_created_at
         FROM (
           SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner,
                  id, content, sender_id, receiver_id, read, created_at
             FROM messages
            WHERE sender_id = $1 OR receiver_id = $1
         ) t
        ORDER BY partner, id DESC`,
      [meId],
    );
    if (rows.length === 0) return { items: [], total: 0 };

    const unreadRows: Array<{ partner: number; unread: string }> =
      await this.repo.query(
        `SELECT sender_id AS partner, COUNT(*) AS unread
           FROM messages
          WHERE receiver_id = $1 AND read = false
          GROUP BY sender_id`,
        [meId],
      );
    const unreadMap = new Map(
      unreadRows.map((r) => [Number(r.partner), Number(r.unread)]),
    );

    const partnerIds = rows.map((r) => Number(r.partner));
    const users = await this.userRepo.find({ where: { id: In(partnerIds) } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = rows
      .map((r) => {
        const user = userMap.get(Number(r.partner));
        if (!user || user.status !== "active") return null;
        return {
          partner: toPublicUser(user),
          lastMessage: {
            content: r.last_content,
            mine: Number(r.last_sender_id) === meId,
            createdAt: r.last_created_at,
          },
          unread: unreadMap.get(Number(r.partner)) ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      // 最后消息时间倒序（DISTINCT ON 的输出按 partner 排序，需重排）
      .sort((a, b) =>
        a.lastMessage.createdAt < b.lastMessage.createdAt ? 1 : -1,
      );
    return { items, total: items.length };
  }

  /**
   * 与某人的对话（正序分页）；拉取即把对方发来的未读消息置为已读。
   */
  async chat(meId: number, partnerUsername: string, limit = 50, offset = 0) {
    const partner = await this.findActiveUser(partnerUsername);
    const safeLimit = clampInt(limit, 50, 100);
    const safeOffset = Number.isFinite(offset)
      ? Math.max(0, Math.trunc(offset))
      : 0;
    const where = [
      { senderId: meId, receiverId: partner.id },
      { senderId: partner.id, receiverId: meId },
    ];
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { id: "DESC" },
      take: safeLimit,
      skip: safeOffset,
    });
    // 打开/轮询会话即已读（只标记对方发给我的）
    await this.repo.update(
      { senderId: partner.id, receiverId: meId, read: false },
      { read: true },
    );
    return {
      partner: toPublicUser(partner),
      // DESC 取页后反转为正序，前端按时间从上到下渲染
      items: rows.reverse(),
      total,
    };
  }
}
