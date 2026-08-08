import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsUUID } from 'class-validator';

export class UpdateDayAvailabilityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  company_public_id: string;

  @ApiProperty({
    format: 'date',
    example: '2026-07-26',
    description: 'Data do dia (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description:
      'false = fechar o dia (inativar livres); true = reabrir inativos',
  })
  @IsBoolean()
  available: boolean;
}
