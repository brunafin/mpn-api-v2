import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SearchGoogleCourtsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @IsString()
  @Length(2, 2)
  uf: string;

  /** Termos extras além das buscas padrão (quadra esportiva / society). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  queries?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  maxPages?: number;
}
