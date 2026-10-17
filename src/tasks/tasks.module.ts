import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../book/book.entity';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  providers: [TasksService],
})
export class TasksModule {}
