import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ maxLength: 50 })
  contact_name: string;

  @ApiProperty({ maxLength: 15 })
  contact_phone: string;

  @ApiProperty({ type: 'string', nullable: true })
  token_to_cancel: string;

  @ApiProperty()
  court_schedule_id: number;
}
