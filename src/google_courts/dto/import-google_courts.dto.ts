import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportGoogleCourtPlaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  googlePlaceId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  fullAddress?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  googleMapsUri?: string | null;

  @IsOptional()
  @IsNumber()
  rating?: number | null;

  @IsOptional()
  @IsNumber()
  userRatingsTotal?: number | null;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;
}

export class ImportGoogleCourtsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @IsString()
  @Length(2, 2)
  uf: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ImportGoogleCourtPlaceDto)
  places: ImportGoogleCourtPlaceDto[];
}
