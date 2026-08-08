import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

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
}
