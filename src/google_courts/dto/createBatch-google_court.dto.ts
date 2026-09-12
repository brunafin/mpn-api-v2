import { Allow, IsArray, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateBatchGoogleCourtDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsArray()
  @Allow()
  places: Array<{
    id?: string;
    nationalPhoneNumber?: string;
    formattedAddress?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    businessStatus?: string;
    location?: { latitude?: number; longitude?: number };
    displayName?: { text?: string; languageCode?: string };
  }>;
}
