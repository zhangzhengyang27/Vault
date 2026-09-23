import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('resources')
@Index(['status'])
export class Resource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  type?: string;

  @Column('text', { nullable: true })
  description?: string;

  /** 资源官方地址（课程页/文档站/书籍官网），用于详情页跳转出口 */
  @Column({ type: 'varchar', name: 'source_url', nullable: true })
  sourceUrl?: string;

  @Column({ default: 'v1' })
  phase: string;

  /**
   * 内容状态：published 公开可见；pending 待人工审核；rejected 已驳回。
   * 存量数据保持 published；新导入的资源走管理端流程。
   */
  @Column({ default: 'published' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
