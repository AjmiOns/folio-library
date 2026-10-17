import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../user/user-role.enum';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
