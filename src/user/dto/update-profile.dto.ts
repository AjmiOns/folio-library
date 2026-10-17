import { PartialType, PickType } from '@nestjs/swagger';
import { SignupDto } from '../../auth/dto/signup.dto';

export class UpdateProfileDto extends PartialType(PickType(SignupDto, ['email', 'username'] as const)) {}
