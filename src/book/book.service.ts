import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { IsNull, Not, Repository } from 'typeorm';
import { Author } from '../author/author.entity';
import { Category } from '../category/category.entity';
import { AuthUser } from '../common/current-user.decorator';
import { Favorite } from '../favorite/favorite.entity';
import { Book } from './book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UPLOAD_DIR } from './upload.config';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  findAll(trashed = false) {
    return this.books.find({
      relations: { auteur: true, categorie: true },
      withDeleted: trashed,
      where: trashed ? { deletedAt: Not(IsNull()) } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const book = await this.books.findOne({
      where: { id },
      relations: { auteur: true, categorie: true },
    });
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    return book;
  }

  async create(dto: CreateBookDto, user: AuthUser) {
    const { auteurId, categorieId, ...fields } = dto;
    const auteur = await this.getAuthor(auteurId);
    const categorie = categorieId ? await this.getCategory(categorieId) : null;
    const saved = await this.books.save(
      this.books.create({
        ...fields,
        image: fields.image ?? null,
        auteur,
        categorie,
        user: { id: user.id },
      }),
    );
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateBookDto) {
    const book = await this.findOne(id);
    const { auteurId, categorieId, ...fields } = dto;
    if (auteurId !== undefined) book.auteur = await this.getAuthor(auteurId);
    if (categorieId !== undefined) book.categorie = await this.getCategory(categorieId);
    Object.assign(book, fields);
    await this.books.save(book);
    return this.findOne(id);
  }

  async softDelete(id: number) {
    await this.findOne(id);
    await this.books.softDelete(id);
    return { softDeleted: true, id };
  }

  async hardDelete(id: number) {
    const book = await this.books.findOne({ where: { id }, withDeleted: true });
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    await this.books.delete(id); // favorites are removed by cascade
    await this.removeImageFile(book.image);
    return { deleted: true, id };
  }

  async recover(id: number) {
    const book = await this.books.findOne({ where: { id }, withDeleted: true });
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    if (!book.deletedAt) throw new ConflictException("This book is not in the trash");
    await this.books.restore(id);
    return this.findOne(id);
  }

  async stats() {
    const [totalBooks, totalAuthors, totalCategories, totalFavorites] = await Promise.all([
      this.books.count(),
      this.authors.count(),
      this.categories.count(),
      this.favorites.count(),
    ]);

    const booksPerCategory = await this.books
      .createQueryBuilder('b')
      .leftJoin('b.categorie', 'c')
      .select("COALESCE(c.nom, 'Uncategorized')", 'categorie')
      .addSelect('COUNT(b.id)', 'total')
      .groupBy('c.id')
      .addGroupBy('c.nom')
      .orderBy('COUNT(b.id)', 'DESC')
      .getRawMany();

    const booksPerAuthor = await this.books
      .createQueryBuilder('b')
      .innerJoin('b.auteur', 'a')
      .select("a.prenom || ' ' || a.nom", 'auteur')
      .addSelect('COUNT(b.id)', 'total')
      .groupBy('a.id')
      .orderBy('COUNT(b.id)', 'DESC')
      .limit(8)
      .getRawMany();

    const byDecade = await this.books
      .createQueryBuilder('b')
      .select('FLOOR(b.annee / 10) * 10', 'decade')
      .addSelect('COUNT(b.id)', 'total')
      .groupBy('FLOOR(b.annee / 10) * 10')
      .orderBy('FLOOR(b.annee / 10) * 10', 'ASC')
      .getRawMany();

    const mostFavorited = await this.favorites
      .createQueryBuilder('f')
      .innerJoin('f.book', 'b')
      .select('b.id', 'id')
      .addSelect('b.titre', 'titre')
      .addSelect('COUNT(f.id)', 'total')
      .groupBy('b.id')
      .orderBy('COUNT(f.id)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalBooks,
      totalAuthors,
      totalCategories,
      totalFavorites,
      booksPerCategory: booksPerCategory.map((r) => ({ categorie: r.categorie, total: Number(r.total) })),
      booksPerAuthor: booksPerAuthor.map((r) => ({ auteur: r.auteur, total: Number(r.total) })),
      byDecade: byDecade.map((r) => ({ decade: Number(r.decade), total: Number(r.total) })),
      mostFavorited: mostFavorited.map((r) => ({ id: r.id, titre: r.titre, total: Number(r.total) })),
    };
  }

  private async getAuthor(id: number) {
    const author = await this.authors.findOneBy({ id });
    if (!author) throw new NotFoundException(`Author #${id} not found`);
    return author;
  }

  private async getCategory(id: number) {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  private async removeImageFile(image: string | null) {
    if (!image || /^https?:\/\//i.test(image)) return;
    try {
      await fs.unlink(join(UPLOAD_DIR, basename(image)));
    } catch {
      /* fichier déjà absent : sans conséquence */
    }
  }
}
