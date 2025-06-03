import { ApiProperty } from '@nestjs/swagger';

export class CreateCourtScheduleDto {
  @ApiProperty({
    type: 'string',
    format: 'time',
    description: 'Hora de início do agendamento',
  })
  start_hour: string;

  @ApiProperty({
    type: 'string',
    format: 'time',
    description: 'Hora de término do agendamento',
  })
  end_hour: string;

  @ApiProperty({
    type: 'string',
    format: 'date',
    description: 'Data do agendamento',
  })
  date: Date;

  @ApiProperty({ default: true, description: 'Disponibilidade do horário' })
  available: boolean;

  @ApiProperty({
    type: 'number',
    format: 'decimal',
    description: 'Preço do agendamento',
    example: '12345.67',
  })
  price: number;

  @ApiProperty({ description: 'ID da quadra' })
  court_id: number;

  @ApiProperty({ description: 'ID do dia da semana' })
  day_of_week_id: number;

  @ApiProperty({ description: 'Indica se o horário é fixo', default: false })
  is_fixed: boolean;

  @ApiProperty({
    description: 'ID do cliente da empresa',
    required: false,
    nullable: true,
    type: 'number',
  })
  company_customer_id?: number | null;
}
