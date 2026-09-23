import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('repos')
export class Repo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ nullable: true })
  stars?: string;

  @Column({ nullable: true })
  lang?: string;

  @Column({ default: 'mvp' })
  phase: string;

  /** 内容状态：published（前台可见）/ pending（采集待审）/ rejected / archived */
  @Column({ default: 'published' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
