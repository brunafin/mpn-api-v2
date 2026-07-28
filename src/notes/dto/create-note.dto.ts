import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({
    description: 'ID público da empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  companyPublicId: string;

  @ApiProperty({
    description: 'Data da nota (ISO 8601)',
    example: '2025-07-30',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    maxLength: 255,
    description: 'Mensagem da nota',
    example: 'Nota importante sobre a empresa.',
  })
  @IsString()
  @MaxLength(255)
  message: string;
}
