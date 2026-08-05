import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
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
    description: 'Nome do contato do horário fixo',
    type: 'string',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fixed_contact_name: string | null = null;

  @ApiProperty({
    description: 'Telefone do contato do horário fixo (opcional)',
    type: 'string',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  fixed_contact_phone: string | null = null;
}
