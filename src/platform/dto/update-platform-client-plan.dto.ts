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

  /** Se true, encerra o trial imediatamente (mantém trial_ends_at como histórico). */
  @IsOptional()
  @IsBoolean()
  endTrial?: boolean;

  /** Atualiza a data de fim do trial (ISO). Nunca limpa — use endTrial para encerrar. */
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;
}
