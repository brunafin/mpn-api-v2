import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({
    description: 'ID público da empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  companyPublicId: string;

  @ApiProperty({
    description: 'Data da nota (ISO 8601)',
    example: '2025-07-30',
  })
  date: string;

  @ApiProperty({
    maxLength: 255,
    description: 'Mensagem da nota',
    example: 'Nota importante sobre a empresa.',
  })
  message: string;

  @ApiProperty({ description: 'Indica se é 24 horas antes', example: true })
  is24HoursBefore: boolean;
}
