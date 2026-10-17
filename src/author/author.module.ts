import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Book } from '../book/book.entity';
import { AuthorController } from './author.controller';
import { Author } from './author.entity';
import { AuthorService } from './author.service';

@Module({
  imports: [TypeOrmModule.forFeature([Author, Book]), AuthModule],
  controllers: [AuthorController],
  providers: [AuthorService],
})
export class AuthorModule {}
