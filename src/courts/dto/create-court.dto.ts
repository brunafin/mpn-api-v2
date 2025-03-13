import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString } from 'class-validator';

export class CreateCourtDto {
  @ApiProperty({ maxLength: 100, description: 'Nome da quadra' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID da empresa' })
  @IsInt()
  company_id: number;

  @ApiProperty({ description: 'Status da visibilidade da quadra no site' })
  @IsBoolean()
  show: boolean;
}
