import { IsOptional, IsString } from 'class-validator';

export class StartBillingContractDto {
  /** CPF do responsável (com ou sem máscara). Normalizado no service. */
  @IsOptional()
  @IsString()
  cpf?: string;
}
