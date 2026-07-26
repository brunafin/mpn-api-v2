import { IsOptional, IsString } from 'class-validator';

export class GenerateBillingPixDto {
  /** CPF do responsável (com ou sem máscara). Normalizado no service. */
  @IsOptional()
  @IsString()
  cpf?: string;
}
