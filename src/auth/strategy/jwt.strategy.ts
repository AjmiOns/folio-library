import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/current-user.decorator';
import { User } from '../../user/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // The role is re-read from the database, so a role change takes effect immediately.
  async validate(payload: { sub: number }): Promise<AuthUser> {
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, username: user.username, role: user.role };
  }
}
