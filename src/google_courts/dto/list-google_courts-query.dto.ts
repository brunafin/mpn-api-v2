import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { CourtCompetitor } from '../enums/competitor.enum';
import { OutreachStatus } from '../enums/outreach-status.enum';

function optionalQueryFlag(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

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

  /** Só quem tem telefone no Google. */
  @IsOptional()
  @Transform(({ value }) => optionalQueryFlag(value))
  @IsBoolean()
  hasPhone?: boolean;

  /**
   * yes = aluga hora ou ainda não marcado.
   * no = marcado como não aluga.
   */
  @IsOptional()
  @IsIn(['yes', 'no'])
  hourly?: 'yes' | 'no';

  /** Próxima ação vazia, hoje ou atrasada. */
  @IsOptional()
  @Transform(({ value }) => optionalQueryFlag(value))
  @IsBoolean()
  due?: boolean;

  /** Ainda dá para abordar: sem cliente, sem perda, sem “fechou”. */
  @IsOptional()
  @Transform(({ value }) => optionalQueryFlag(value))
  @IsBoolean()
  open?: boolean;

  @IsOptional()
  @IsIn(['name', 'reviews'])
  sort?: 'name' | 'reviews';

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
