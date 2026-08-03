import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MAX_COURT_PRICE_REAIS } from 'src/utils/court-price';

export class CreateOperatingScheduleDto {
  @ApiProperty({
    type: 'string',
    format: 'time',
    description: 'Hora do agendamento',
    example: '10:00',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  hour: string;

  @ApiProperty({
    type: 'number',
    format: 'decimal',
    description: 'Preço do agendamento',
    example: '90.00',
    maximum: MAX_COURT_PRICE_REAIS,
  })
  @IsNumber()
  @Min(0)
  @Max(MAX_COURT_PRICE_REAIS)
  price: number;

  @ApiProperty({ description: 'ID do dia da semana' })
  @IsInt()
  day_of_week_id: number;

  @ApiProperty({ description: 'ID da quadra' })
  @IsInt()
  court_id: number;

  @ApiProperty({
    description: 'Indica se o horário é fixo',
    default: false,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  is_fixed: boolean = false;

  @ApiProperty({
    description: 'ID do cliente da empresa',
    type: 'number',
    nullable: true,
    default: null,
  })
  @IsOptional()
  @IsInt()
  company_customer_id: number | null = null;
}
