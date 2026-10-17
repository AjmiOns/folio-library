import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorie')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40, unique: true })
  nom: string;
}
