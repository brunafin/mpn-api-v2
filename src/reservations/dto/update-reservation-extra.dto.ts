import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { OBSERVATION_MAX_LENGTH } from 'src/utils/sanitize-note-text';

export class UpdateReservationExtraDto {
  @ApiPropertyOptional({ maxLength: OBSERVATION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(OBSERVATION_MAX_LENGTH)
  observation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_barbecue_included?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_event?: boolean;

  @ApiPropertyOptional({ description: 'Esporte da reserva, entre os da quadra' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sport_id?: number;
}
