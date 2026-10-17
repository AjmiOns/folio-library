import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../book/book.entity';
import { Author } from './author.entity';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Injectable()
export class AuthorService {
  constructor(
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    @InjectRepository(Book) private readonly books: Repository<Book>,
  ) {}

  findAll() {
    return this.authors.find({
      relations: { listeLivres: true },
      order: { nom: 'ASC', prenom: 'ASC' },
    });
  }

  async findOne(id: number) {
    const author = await this.authors.findOne({ where: { id }, relations: { listeLivres: true } });
    if (!author) throw new NotFoundException(`Author #${id} not found`);
    return author;
  }

  create(dto: CreateAuthorDto) {
    return this.authors.save(this.authors.create(dto));
  }

  async update(id: number, dto: UpdateAuthorDto) {
    const author = await this.authors.findOneBy({ id });
    if (!author) throw new NotFoundException(`Author #${id} not found`);
    Object.assign(author, dto);
    await this.authors.save(author);
    return this.findOne(id);
  }

  async remove(id: number) {
    const author = await this.authors.findOneBy({ id });
    if (!author) throw new NotFoundException(`Author #${id} not found`);

    // Trashed books count too: they still reference the author.
    const linked = await this.books.count({ where: { auteur: { id } }, withDeleted: true });
    if (linked > 0) {
      throw new ConflictException(
        `Cannot delete this author: ${linked} book(s) are still linked to them (trash included).`,
      );
    }
    await this.authors.delete(id);
    return { deleted: true, id };
  }
}
