import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Book } from '../book/book.entity';
import { FavoriteController } from './favorite.controller';
import { Favorite } from './favorite.entity';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Book]), AuthModule],
  controllers: [FavoriteController],
  providers: [FavoriteService],
})
export class FavoriteModule {}
