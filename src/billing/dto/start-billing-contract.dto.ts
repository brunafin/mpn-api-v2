import { IsEmail, IsOptional, IsString } from 'class-validator';

export class StartBillingContractDto {
  /** CPF do responsável (com ou sem máscara). Normalizado no service. */
  @IsOptional()
  @IsString()
  cpf?: string;

  /** E-mail do responsável (Mercado Pago exige payer.email). */
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;
}
