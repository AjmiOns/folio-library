import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(30, { message: "Email cannot exceed 30 characters" })
  email: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters" })
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: "Username may only contain letters, numbers, dots, dashes and underscores",
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64)
  password: string;
}
