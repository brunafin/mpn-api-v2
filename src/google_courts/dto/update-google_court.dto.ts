import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { CourtCompetitor } from '../enums/competitor.enum';
import { LostReason } from '../enums/lost-reason.enum';
import { OutreachStatus } from '../enums/outreach-status.enum';
import { PlaceKind } from '../enums/place-kind.enum';

export class UpdateGoogleCourtOutreachDto {
  @IsOptional()
  @IsEnum(OutreachStatus)
  outreachStatus?: OutreachStatus;

  @IsOptional()
  @IsEnum(CourtCompetitor)
  competitor?: CourtCompetitor;

  @IsOptional()
  @IsEnum(PlaceKind)
  placeKind?: PlaceKind | null;

  /** YYYY-MM-DD. Null limpa a data e devolve o prospecto para a fila de hoje. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextActionOn?: string | null;

  @IsOptional()
  @IsEnum(LostReason)
  lostReason?: LostReason | null;

  @IsOptional()
  @IsBoolean()
  rentsHourly?: boolean | null;

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
