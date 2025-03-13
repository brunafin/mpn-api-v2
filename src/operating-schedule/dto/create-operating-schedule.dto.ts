import { ApiProperty } from '@nestjs/swagger';

export class CreateOperatingScheduleDto {
  @ApiProperty({ description: 'Hora do agendamento' })
  hour: number;

  @ApiProperty({
    type: 'number',
    format: 'float',
    description: 'Preço do agendamento',
  })
  price: number;

  @ApiProperty({ description: 'ID do dia da semana' })
  day_of_week_id: number;

  @ApiProperty({ description: 'ID da quadra' })
  court_id: number;
}
