import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category } from "../../entities/category.entity";
import { isPgErrorWithCode } from "../../common/pg-error";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  /** kind 传入时只返回「有该类型已发布内容」的分类并附带内容计数,
   *  供列表页渲染分类 chips——避免把知识库/图片等其它业务线的
   *  空分类平铺成一堆点了没内容的按钮。
   *  kind='tool' 统计工具表;'general'/'precise' 统计对应类型的提示词。
   *  表名来自白名单,类型值一律走参数化,防止拼接注入/标识符误解析 */
  async findAll(kind?: string) {
    const cats = await this.repo.find({
      order: { sortOrder: "ASC", id: "ASC" },
    });
    if (!kind) return cats;
    const rows: { category_id: number; n: string }[] =
      kind === "tool"
        ? await this.repo.query(
            `SELECT category_id, COUNT(*)::text AS n FROM tools
             WHERE status = 'published' AND category_id IS NOT NULL
             GROUP BY category_id`,
          )
        : await this.repo.query(
            `SELECT category_id, COUNT(*)::text AS n FROM prompts
             WHERE status = 'published' AND kind = $1 AND category_id IS NOT NULL
             GROUP BY category_id`,
            [kind],
          );
    const counts = new Map(
      rows.map((r) => [Number(r.category_id), Number(r.n)]),
    );
    return cats
      .filter((c) => counts.has(c.id))
      .map((c) => ({ ...c, count: counts.get(c.id) }));
  }

  create(slug: string, name: string, parentId?: number | null) {
    return this.repo.save(
      this.repo.create({ slug, name, parentId: parentId ?? null }),
    );
  }

  /** 校验父级：存在、不能是自己、不能形成环（沿 parentId 向上走） */
  private async assertValidParent(
    id: number | null | undefined,
    parentId: number | null,
  ) {
    if (parentId == null) return;
    if (id != null && parentId === id) {
      throw new BadRequestException("父级分类不能是自己");
    }
    let cursor: number | null = parentId;
    const seen = new Set<number>();
    while (cursor != null) {
      if (id != null && cursor === id) {
        throw new BadRequestException("分类层级不能形成环");
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const row: { parentId: number | null } | null = await this.repo.findOne({
        where: { id: cursor },
        select: { id: true, parentId: true },
      });
      if (!row) throw new NotFoundException("父级分类不存在");
      cursor = row.parentId;
    }
  }

  async update(id: number, dto: Partial<Category>) {
    const category = await this.repo.findOne({ where: { id } });
    if (!category) throw new NotFoundException("分类不存在");
    if (dto.slug !== undefined) category.slug = dto.slug;
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.parentId !== undefined) {
      await this.assertValidParent(id, dto.parentId ?? null);
      category.parentId = dto.parentId;
    }
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    return this.repo.save(category);
  }

  async remove(id: number) {
    const category = await this.repo.findOne({ where: { id } });
    if (!category) throw new NotFoundException("分类不存在");
    // 先挂空子级，避免删除父级后子分类指向不存在的 parentId
    await this.repo.update({ parentId: id }, { parentId: null });
    try {
      return await this.repo.remove(category);
    } catch (e) {
      // 外键约束（tools/prompts/articles 引用 categories）：给出友好提示而非裸 500
      if (isPgErrorWithCode(e, "23503")) {
        throw new ConflictException(
          "该分类下仍有内容引用，无法删除，请先调整引用",
        );
      }
      throw e;
    }
  }
}
