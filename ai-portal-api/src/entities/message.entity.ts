import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/** 私信：会话 = 两人之间的消息集合；read 只标记收件人是否已读 */
@Entity('messages')
@Index(['receiverId', 'read'])
@Index(['senderId', 'receiverId'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sender_id' })
  senderId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'receiver_id' })
  receiverId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column('text')
  content: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
