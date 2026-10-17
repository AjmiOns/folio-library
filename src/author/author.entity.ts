import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamp } from '../common/timestamp.entity';
import { Book } from '../book/book.entity';

@Entity('auteur')
export class Author extends Timestamp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  prenom: string;

  @Column({ length: 20 })
  nom: string;

  @OneToMany(() => Book, (book) => book.auteur)
  listeLivres: Book[];
}
