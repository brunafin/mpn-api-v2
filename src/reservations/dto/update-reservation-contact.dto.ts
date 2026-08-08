import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReservationContactDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  contactName: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string | null;
}
