import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UnfixScheduleDto {
  @ApiProperty({
    description: 'public_id do horário de quadra',
    format: 'uuid',
  })
  @IsUUID()
  court_schedule_public_id: string;
}
