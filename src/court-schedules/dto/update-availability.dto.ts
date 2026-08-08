import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty({ description: 'Disponibilidade do horário' })
  @IsBoolean()
  available: boolean;
}
