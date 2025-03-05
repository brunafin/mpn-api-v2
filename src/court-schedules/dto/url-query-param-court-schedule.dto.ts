import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UrlQueryParamCourtScheduleDto {
  @IsNumber()
  @Type(() => Number)
  courtId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  hour?: number;

  @IsOptional()
  @IsDateString()
  date?: Date;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  typeOfCourtId?: number;
}
