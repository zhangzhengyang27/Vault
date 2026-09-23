import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('favorites')
@Unique(['user', 'targetType', 'targetId'])
@Index(['user'])
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ name: 'target_id' })
  targetId: number;

  @Column({ name: 'target_slug', type: 'varchar', length: 200, nullable: true })
  targetSlug?: string | null;

  @Column({ name: 'title', type: 'varchar', length: 200, nullable: true })
  title?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
