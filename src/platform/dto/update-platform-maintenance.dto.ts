import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlatformMaintenanceDto {
  @IsBoolean()
  maintenance: boolean;

  /** Texto da tela pública. Vazio ou ausente: ausente preserva; vazio limpa. */
  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string | null;
}
