import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class UpdateAvailabilityBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  company_public_id: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-07-26',
    description: 'Se informado, só aplica em horários desta data (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    type: [String],
    description: 'public_id dos court_schedule a alterar',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  public_ids: string[];

  @ApiProperty({
    description:
      'false = inativar livres; true = ativar inativos (pula passado/reservado/fixo)',
  })
  @IsBoolean()
  available: boolean;
}
