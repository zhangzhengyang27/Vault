import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mcps')
@Index(['status'])
export class Mcp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ nullable: true })
  endpoint?: string;

  /** 内容类型：mcp = MCP 服务器；skill = Agent Skill */
  @Column({ default: 'mcp' })
  type: string;

  /** 技能/服务分类标签（simple-array，逗号分隔存储） */
  @Column('simple-array', { nullable: true })
  tags?: string[];

  /**
   * 安装方式（scripts/probe-mcp-install.mjs 探测落库）：
   * npx / uvx / docker / remote / unknown；NULL = 未探测，前端回退启发式推断。
   */
  @Column({ type: 'varchar', name: 'install_method', nullable: true })
  installMethod?: string;

  /** 安装目标：npm 包名 / PyPI 包名 / 镜像名 / 远程 URL */
  @Column({ type: 'varchar', name: 'install_target', nullable: true })
  installTarget?: string;

  /**
   * 来源仓库（skill 用）：技能文件的实际出处（GitHub 仓库等），
   * endpoint 存的是安装路径（如 ~/.claude/skills/pdf），两者互补。
   */
  @Column({ type: 'varchar', name: 'source_url', nullable: true })
  sourceUrl?: string;

  @Column({ default: 'v1' })
  phase: string;

  /**
   * 内容状态：published 公开可见；pending 待人工审核；rejected 已驳回。
   * 存量数据保持 published；新同步的 registry 条目写为 pending。
   */
  @Column({ default: 'published' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
