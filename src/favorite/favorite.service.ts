import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../book/book.entity';
import { Favorite } from './favorite.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    @InjectRepository(Book) private readonly books: Repository<Book>,
  ) {}

  async findMine(userId: number) {
    const favs = await this.favorites.find({
      where: { user: { id: userId } },
      relations: { book: { auteur: true, categorie: true } },
      order: { createdAt: 'DESC' },
    });
    // A trashed book disappears from the favorites list.
    return favs.filter((f) => f.book && !f.book.deletedAt);
  }

  async add(userId: number, bookId: number) {
    const book = await this.books.findOneBy({ id: bookId });
    if (!book) throw new NotFoundException(`Book #${bookId} not found`);

    const existing = await this.favorites.findOne({
      where: { user: { id: userId }, book: { id: bookId } },
    });
    if (existing) throw new ConflictException('This book is already in your favorites');

    const saved = await this.favorites.save(
      this.favorites.create({ user: { id: userId }, book: { id: bookId } }),
    );
    return { id: saved.id, bookId };
  }

  async remove(userId: number, bookId: number) {
    const fav = await this.favorites.findOne({
      where: { user: { id: userId }, book: { id: bookId } },
    });
    if (!fav) throw new NotFoundException("This book is not in your favorites");
    await this.favorites.remove(fav);
    return { deleted: true, bookId };
  }
}
