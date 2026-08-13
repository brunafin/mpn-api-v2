import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { SPORT_NAME_MAX_LENGTH } from '../resolve-sports';

export class SportNameDto {
  @ApiProperty({ example: 'Futsal', maxLength: SPORT_NAME_MAX_LENGTH })
  @IsString()
  @MaxLength(SPORT_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    description: 'Obrigatório só ao criar um esporte novo no catálogo.',
  })
  @IsOptional()
  @IsBoolean()
  needsNet?: boolean;
}
