import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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

  /** Se true, registra contato agora (status vira contacted se ainda for new). */
  @IsOptional()
  @IsBoolean()
  markContacted?: boolean;
}
