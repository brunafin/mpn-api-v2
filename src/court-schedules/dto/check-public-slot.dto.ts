import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

export class CheckPublicSlotQueryDto {
  @ApiProperty({ example: 'poliplay' })
  @IsString()
  @MaxLength(120)
  slug: string;

  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startHour: string;

  @ApiProperty({ example: 'Quadra 1' })
  @IsString()
  @MaxLength(120)
  courtName: string;
}
