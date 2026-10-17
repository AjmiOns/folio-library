import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Book } from '../book/book.entity';

const TRASH_RETENTION_DAYS = 30;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(@InjectRepository(Book) private readonly books: Repository<Book>) {}

  /** Every night: permanently delete books that have been in the trash for over 30 days. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeTrash() {
    const limit = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.books.delete({ deletedAt: LessThan(limit) });
    this.logger.log(`Trash purged: ${result.affected ?? 0} book(s) permanently deleted`);
  }
}
