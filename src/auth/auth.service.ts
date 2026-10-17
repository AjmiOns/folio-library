import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { UserRole } from '../user/user-role.enum';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const duplicate = await this.users.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (duplicate) {
      throw new ConflictException("Email or username is already in use");
    }

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(dto.password, salt);

    // The first account created on an empty database becomes the administrator.
    const role = (await this.users.count()) === 0 ? UserRole.ADMIN : UserRole.USER;

    try {
      const user = await this.users.save(
        this.users.create({ email: dto.email, username: dto.username, password, salt, role }),
      );
      return { id: user.id, email: user.email, username: user.username, role: user.role };
    } catch (err: any) {
      if (err?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException("Email or username is already in use");
      }
      throw err;
    }
  }

  async signin(dto: SigninDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect(['u.password', 'u.salt'])
      .where('u.email = :email OR u.username = :login', {
        email: dto.login.toLowerCase(),
        login: dto.login,
      })
      .getOne();

    const valid = user && (await bcrypt.compare(dto.password, user.password));
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    };
  }
}
