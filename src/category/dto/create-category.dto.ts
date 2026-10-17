import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(40, { message: 'Name cannot exceed 40 characters' })
  nom: string;
}
