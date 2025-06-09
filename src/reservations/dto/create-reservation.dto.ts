import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ maxLength: 50, description: 'Nome do contato', example: 'João da Silva' })
  contactName: string;

  @ApiProperty({ maxLength: 11, description: 'Telefone do contato com DDD', example: '51912345678' })
  contactPhone: string;

  @ApiProperty({ description: 'ID do agendamento da quadra', example: '550e8400-e29b-41d4-a716-446655440000' })
  courtSchedulePublicId: string;

  @ApiProperty({ required: false, maxLength: 255, description: 'Observações adicionais', example: 'Levar bolas extras' })
  observation?: string;

  @ApiProperty({ required: false, description: 'Reserva inclui churrasqueira', example: true })
  isBarbecueIncluded?: boolean;
}
