import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CreateAuthorDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(20, { message: 'First name cannot exceed 20 characters' })
  prenom: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(20, { message: 'Last name cannot exceed 20 characters' })
  nom: string;
}
