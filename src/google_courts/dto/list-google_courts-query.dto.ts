import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { CourtCompetitor } from '../enums/competitor.enum';
import { OutreachStatus } from '../enums/outreach-status.enum';

export class ListGoogleCourtsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsEnum(OutreachStatus)
  status?: OutreachStatus;

  @IsOptional()
  @IsEnum(CourtCompetitor)
  competitor?: CourtCompetitor;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
