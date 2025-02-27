import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString } from 'class-validator';

export class CreateCourtDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  name: string;

  @ApiProperty()
  @IsInt()
  company_id: number;

  @ApiProperty()
  @IsBoolean()
  show: boolean;
}
