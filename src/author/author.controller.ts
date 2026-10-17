import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UserRole } from '../user/user-role.enum';
import { AuthorService } from './author.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@ApiTags('authors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('authors')
export class AuthorController {
  constructor(private readonly service: AuthorService) {}

  @Get('all')
  findAll() {
    return this.service.findAll();
  }

  @Get('all/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post('add')
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAuthorDto) {
    return this.service.create(dto);
  }

  @Put('edit/:id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuthorDto) {
    return this.service.update(id, dto);
  }

  @Delete('delete/:id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
