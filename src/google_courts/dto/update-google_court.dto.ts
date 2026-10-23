import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { CourtCompetitor } from '../enums/competitor.enum';
import { OutreachStatus } from '../enums/outreach-status.enum';

export class UpdateGoogleCourtOutreachDto {
  @IsOptional()
  @IsEnum(OutreachStatus)
  outreachStatus?: OutreachStatus;

  @IsOptional()
  @IsEnum(CourtCompetitor)
  competitor?: CourtCompetitor;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  /** Cidade do portfólio. O endereço do Google pode apontar outra. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  /** Se true, registra contato agora (status vira contacted se ainda for new). */
  @IsOptional()
  @IsBoolean()
  markContacted?: boolean;
}
