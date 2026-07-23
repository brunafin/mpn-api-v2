import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCourtVisibilityDto {
  @ApiProperty({
    description: 'Se a quadra deve aparecer no site público',
    example: true,
  })
  @IsBoolean()
  show: boolean;
}
