import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { escapeLike, LIKE_ESCAPE_SQL } from "../../common/like.util";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** 用户列表：搜索（用户名/邮箱）+ 角色/状态过滤 + 分页，不返回密码哈希 */
  async list(
    query: {
      q?: string;
      role?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.users.createQueryBuilder("user");
    qb.select([
      "user.id",
      "user.username",
      "user.email",
      "user.role",
      "user.status",
      "user.createdAt",
    ]);

    if (query.q) {
      qb.andWhere(
        `(user.username ILIKE :q OR user.email ILIKE :q${LIKE_ESCAPE_SQL})`,
        { q: `%${escapeLike(query.q)}%` },
      );
    }
    if (query.role && query.role !== "all") {
      qb.andWhere("user.role = :role", { role: query.role });
    }
    if (query.status && query.status !== "all") {
      qb.andWhere("user.status = :status", { status: query.status });
    }

    qb.orderBy("user.id", "DESC");
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  /** 封禁/解封：禁止操作自己 */
  async updateStatus(id: number, operatorId: number, status: string) {
    if (id === operatorId) {
      throw new BadRequestException("不能修改自己的状态");
    }
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException("用户不存在");
    user.status = status;
    await this.users.save(user);
    return { success: true, id, status: user.status };
  }

  /** 角色变更：禁止自己降级为普通用户 */
  async updateRole(id: number, operatorId: number, role: string) {
    if (id === operatorId && role !== "admin") {
      throw new BadRequestException("不能移除自己的管理员角色");
    }
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException("用户不存在");
    user.role = role;
    await this.users.save(user);
    return { success: true, id, role: user.role };
  }
}
