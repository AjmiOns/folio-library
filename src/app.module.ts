import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AuthorModule } from './author/author.module';
import { BookModule } from './book/book.module';
import { CategoryModule } from './category/category.module';
import { FavoriteModule } from './favorite/favorite.module';
import { TasksModule } from './tasks/tasks.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get('DB_USER', 'folio'),
        password: config.get('DB_PASSWORD', 'folio'),
        database: config.get('DB_NAME', 'folio'),
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNC') === 'true',
      }),
    }),
    AuthModule,
    AuthorModule,
    BookModule,
    CategoryModule,
    FavoriteModule,
    TasksModule,
    UserModule,
  ],
})
export class AppModule {}
