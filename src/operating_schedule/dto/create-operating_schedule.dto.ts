import { ApiProperty } from '@nestjs/swagger';

export class CreateOperatingScheduleDto {
  @ApiProperty()
  hour: number;

  @ApiProperty({ type: 'number', format: 'float' })
  price: number;

  @ApiProperty()
  day_of_week_id: number;

  @ApiProperty()
  court_id: number;
}
