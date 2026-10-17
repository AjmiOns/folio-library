import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Favorite } from '../favorite/favorite.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  async getProfile(id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    const favoritesCount = await this.favorites.count({ where: { user: { id } } });
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      favoritesCount,
    };
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    const changes: Partial<User> = {};
    if (dto.email && dto.email !== user.email) {
      if (await this.users.findOneBy({ email: dto.email })) {
        throw new ConflictException('This email is already in use');
      }
      changes.email = dto.email;
    }
    if (dto.username && dto.username !== user.username) {
      if (await this.users.findOneBy({ username: dto.username })) {
        throw new ConflictException('This username is already taken');
      }
      changes.username = dto.username;
    }

    if (Object.keys(changes).length) await this.users.update(id, changes);
    return this.getProfile(id);
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect(['u.password', 'u.salt'])
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');

    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current one');
    }

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(dto.newPassword, salt);
    await this.users.update(id, { password, salt });
    return { success: true };
  }
}
