import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class SigninDto {
  /** Email ou nom d'utilisateur */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
