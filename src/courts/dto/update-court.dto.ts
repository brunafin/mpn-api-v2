import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SportNameDto } from 'src/sports/dto/sport-name.dto';
import { COURT_NAME_MAX_LENGTH } from 'src/utils/normalize-form';

/**
 * Atualização estrutural da quadra (pós-onboarding).
 * Esportes por nome (mesmo contrato do onboarding); piso opcional.
 */
export class UpdateCourtDto {
  @ApiPropertyOptional({ maxLength: COURT_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COURT_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  floor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_covered?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_can_have_net?: boolean;

  @ApiPropertyOptional({
    type: [SportNameDto],
    description: 'Esportes (catálogo ou nome novo com needsNet)',
    example: [{ name: 'Futsal' }, { name: 'Vôlei de quadra' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SportNameDto)
  sports?: SportNameDto[];
}
