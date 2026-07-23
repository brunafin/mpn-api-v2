import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdatePlatformClientPlanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  dayDue?: number;

  /** Se true, encerra o trial imediatamente. */
  @IsOptional()
  @IsBoolean()
  endTrial?: boolean;

  /** Atualiza ou redefine trial (ISO date). Null limpa. */
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string | null;
}
