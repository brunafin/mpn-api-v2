import { ApiProperty } from '@nestjs/swagger';

export class CreateOperatingScheduleDto {
  @ApiProperty({
    type: 'string',
    format: 'time',
    description: 'Hora do agendamento',
    example: '10:00'
  })
  hour: string;

  @ApiProperty({
    type: 'number',
    format: 'decimal',
    description: 'Preço do agendamento',
    example: '90.00'
  })
  price: number;

  @ApiProperty({ description: 'ID do dia da semana' })
  day_of_week_id: number;

  @ApiProperty({ description: 'ID da quadra' })
  court_id: number;

  @ApiProperty({
    description: 'Indica se o horário é fixo',
    default: false,
    type: 'boolean'
  })
  is_fixed: boolean = false;

  @ApiProperty({
    description: 'ID do cliente da empresa',
    type: 'number',
    nullable: true,
    default: null
  })
  company_customer_id: number | null = null;
}
