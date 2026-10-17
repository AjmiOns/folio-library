import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UserRole } from '../user/user-role.enum';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { multerOptions, UPLOAD_DIR } from './upload.config';

@ApiTags('books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('books')
export class BookController {
  constructor(private readonly service: BookService) {}

  /** `?trashed=true` (admin only) lists the trash */
  @Get('all')
  findAll(@Query('trashed') trashed: string | undefined, @CurrentUser() user: AuthUser) {
    const wantTrash = trashed === 'true';
    if (wantTrash && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Administrators only');
    }
    return this.service.findAll(wantTrash);
  }

  @Get('all/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  stats() {
    return this.service.stats();
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received (field "file")');
    return { filename: file.filename, url: `/books/images/${file.filename}` };
  }

  @Get('images/:filename')
  image(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = join(UPLOAD_DIR, basename(filename)); // basename : anti path-traversal
    if (!existsSync(fullPath)) throw new NotFoundException('Image not found');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.sendFile(fullPath);
  }

  @Post('add')
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateBookDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Put('edit/:id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.service.update(id, dto);
  }

  @Delete('delete/:id')
  @Roles(UserRole.ADMIN)
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.service.hardDelete(id);
  }

  @Delete('softdelete/:id')
  @Roles(UserRole.ADMIN)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }

  @Patch('recover/:id')
  @Roles(UserRole.ADMIN)
  recover(@Param('id', ParseIntPipe) id: number) {
    return this.service.recover(id);
  }
}
