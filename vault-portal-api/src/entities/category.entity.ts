import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: "int", nullable: true })
  parentId: number | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}
