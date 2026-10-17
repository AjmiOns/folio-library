import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Author } from '../author/author.entity';
import { Category } from '../category/category.entity';
import { Favorite } from '../favorite/favorite.entity';
import { BookController } from './book.controller';
import { Book } from './book.entity';
import { BookService } from './book.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Author, Category, Favorite]), AuthModule],
  controllers: [BookController],
  providers: [BookService],
})
export class BookModule {}
