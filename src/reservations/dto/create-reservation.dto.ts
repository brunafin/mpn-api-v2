import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ maxLength: 50, description: 'Nome do contato' })
  contact_name: string;

  @ApiProperty({ maxLength: 15, description: 'Telefone do contato' })
  contact_phone: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Token para cancelamento',
  })
  token_to_cancel: string;

  @ApiProperty({ description: 'ID do agendamento da quadra' })
  court_schedule_id: number;
}
