import { ApiProperty } from '@nestjs/swagger';

export class CreateCourtScheduleDto {
  @ApiProperty()
  start_hour: string;

  @ApiProperty()
  end_hour: string;

  @ApiProperty({ type: 'string', format: 'date' })
  date: Date;

  @ApiProperty({ default: true })
  available: boolean;

  @ApiProperty({
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  price: number;

  @ApiProperty()
  court_id: number;

  @ApiProperty()
  day_of_week_id: number;
}
