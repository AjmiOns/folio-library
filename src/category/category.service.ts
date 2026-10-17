import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(@InjectRepository(Category) private readonly categories: Repository<Category>) {}

  findAll() {
    return this.categories.find({ order: { nom: 'ASC' } });
  }

  async create(dto: CreateCategoryDto) {
    const duplicate = await this.categories
      .createQueryBuilder('c')
      .where('LOWER(c.nom) = LOWER(:nom)', { nom: dto.nom })
      .getOne();
    if (duplicate) throw new ConflictException('This category already exists');
    return this.categories.save(this.categories.create(dto));
  }

  async update(id: number, dto: CreateCategoryDto) {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    const duplicate = await this.categories
      .createQueryBuilder('c')
      .where('LOWER(c.nom) = LOWER(:nom) AND c.id != :id', { nom: dto.nom, id })
      .getOne();
    if (duplicate) throw new ConflictException('This category already exists');
    category.nom = dto.nom;
    return this.categories.save(category);
  }

  /** Books of a deleted category become uncategorized (FK ON DELETE SET NULL). */
  async remove(id: number) {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    await this.categories.delete(id);
    return { deleted: true, id };
  }
}
