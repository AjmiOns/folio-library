import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Author } from '../author/author.entity';
import { Category } from '../category/category.entity';
import { Timestamp } from '../common/timestamp.entity';
import { Favorite } from '../favorite/favorite.entity';
import { User } from '../user/user.entity';

@Entity('livre')
export class Book extends Timestamp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  titre: string;

  @Column({ length: 100 })
  editeur: string;

  @Column({ type: 'int' })
  annee: number;

  /** Uploaded file name, or an absolute URL */
  @Column({ length: 500, nullable: true })
  image: string | null;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Author, (author) => author.listeLivres, { nullable: false, onDelete: 'RESTRICT' })
  auteur: Author;

  /** Category (nullable: a book can be uncategorized) */
  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  categorie: Category | null;

  /** User who created the entry */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user: User;

  @OneToMany(() => Favorite, (favorite) => favorite.book)
  favoris: Favorite[];
}
