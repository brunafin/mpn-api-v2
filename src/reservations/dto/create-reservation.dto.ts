import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ maxLength: 50, description: 'Nome do contato', example: 'João da Silva' })
  contact_name: string;

  @ApiProperty({ maxLength: 11, description: 'Telefone do contato com DDD', example: '51912345678' })
  contact_phone: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Token para cancelamento',
    example: '1234567890abcdef',
  })
  token_to_cancel: string;

  @ApiProperty({ description: 'ID do agendamento da quadra' })
  court_schedule_id: number;
}
