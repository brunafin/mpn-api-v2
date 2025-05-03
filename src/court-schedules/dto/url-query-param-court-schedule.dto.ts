import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UrlQueryParamCourtScheduleDto {
  @ApiProperty({ description: 'Id da quadra', example: 1 })
  @IsNumber()
  @Type(() => Number)
  courtId: number;

  @ApiPropertyOptional({ description: 'Hora do horário no formato HH:mm', example: '14:30' })
  @IsOptional()
  @IsString()
  hour?: string;

  @ApiPropertyOptional({ description: 'Data do horário no formato ISO 8601', example: '2023-10-01' })
  @IsOptional()
  @IsDateString()
  date?: Date;

  @ApiPropertyOptional({ description: 'Nome da cidade', example: 'Gravataí' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Id do tipo da quadra', example: 2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  typeOfCourtId?: number;
}
