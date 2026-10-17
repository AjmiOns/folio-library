import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Book } from '../book/book.entity';
import { User } from '../user/user.entity';

@Entity('favori')
@Unique(['user', 'book'])
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Book, (book) => book.favoris, { nullable: false, onDelete: 'CASCADE' })
  book: Book;

  @CreateDateColumn()
  createdAt: Date;
}
