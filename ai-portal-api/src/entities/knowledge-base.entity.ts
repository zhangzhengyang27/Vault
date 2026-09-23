import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 知识库元数据：名称对应 articles.knowledge_base，扩展描述/学习路径/排序 */
@Entity('knowledge_bases')
export class KnowledgeBaseMeta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** 是否按分类分组渲染为学习路径（阶段视图 + 进度记录） */
  @Column({ name: 'is_path', default: false })
  isPath: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
