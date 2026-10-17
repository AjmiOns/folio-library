import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { FavoriteService } from './favorite.service';

@ApiTags('favorite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Get('all')
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @Post('add/:bookId')
  add(@Param('bookId', ParseIntPipe) bookId: number, @CurrentUser() user: AuthUser) {
    return this.service.add(user.id, bookId);
  }

  /** Two paths for the same removal, as required by the specification. */
  @Delete(['delete/:bookId', 'add/:bookId'])
  remove(@Param('bookId', ParseIntPipe) bookId: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(user.id, bookId);
  }
}
