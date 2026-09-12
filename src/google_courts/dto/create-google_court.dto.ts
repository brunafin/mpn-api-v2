import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGoogleCourtDto {
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
  phone?: string;

  @IsOptional()
  @IsString()
  fullAddress?: string;
}
