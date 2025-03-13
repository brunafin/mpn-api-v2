import { ApiProperty } from '@nestjs/swagger';

export class CreateCourtScheduleDto {
  @ApiProperty({ description: 'Hora de início do agendamento' })
  start_hour: string;

  @ApiProperty({ description: 'Hora de término do agendamento' })
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
    nullable: true,
    description: 'Preço do agendamento',
  })
  price: number;

  @ApiProperty({ description: 'ID da quadra' })
  court_id: number;

  @ApiProperty({ description: 'ID do dia da semana' })
  day_of_week_id: number;
}
