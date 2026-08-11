import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Atualização estrutural da quadra (pós-onboarding).
 * Esportes por nome (mesmo contrato do onboarding); piso opcional.
 */
export class UpdateCourtDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
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
    type: [String],
    description: 'Nomes dos esportes (ex.: Futsal, Voleibol)',
    example: ['Futsal', 'Voleibol'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sports?: string[];
}
