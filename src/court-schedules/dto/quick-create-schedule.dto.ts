import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_COURT_PRICE_REAIS } from 'src/utils/court-price';

export class QuickCreateScheduleDto {
  @ApiProperty({ example: '10:00', description: 'Hora de início HH:mm' })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  start_hour: string;

  @ApiProperty({ format: 'date', example: '2026-07-26' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'ID numérico da quadra' })
  @Type(() => Number)
  @IsInt()
  court_id: number;

  @ApiPropertyOptional({
    description:
      'Preço do horário em reais. Se omitido, usa o preço do horário de funcionamento ou 0.',
    example: 80,
    minimum: 0,
    maximum: MAX_COURT_PRICE_REAIS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_COURT_PRICE_REAIS)
  price?: number;
}
