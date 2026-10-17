import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBookDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(30, { message: 'Title cannot exceed 30 characters' })
  titre: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Publisher is required" })
  @MaxLength(100)
  editeur: string;

  @Type(() => Number)
  @IsInt({ message: "Year must be an integer" })
  @Min(0)
  @Max(2100)
  annee: number;

  /** File name returned by POST /books/upload, or an absolute URL */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(5000)
  description: string;

  @Type(() => Number)
  @IsInt({ message: 'Invalid author' })
  auteurId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Invalid category' })
  categorieId?: number;
}
