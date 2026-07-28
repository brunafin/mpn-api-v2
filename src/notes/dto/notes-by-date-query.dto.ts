import { IsDateString, IsString, Matches } from 'class-validator';

export class NotesByDateQueryDto {
  @IsString()
  companyPublicId: string;

  /** Sempre YYYY-MM-dd — evita `new Date('YYYY-MM-DD')` virar D-1 em UTC-3. */
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  date: string;
}
