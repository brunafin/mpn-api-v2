import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { IsCpf } from 'src/utils/is-cpf.decorator';
import { CPF_INVALID_MESSAGE } from 'src/utils/normalize-cpf';

export class StartBillingContractDto {
  /** CPF do responsável (com ou sem máscara). Normalizado no service. */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return undefined;
    const digits = value.replace(/\D/g, '');
    return digits || undefined;
  })
  @IsString()
  @IsCpf({ message: CPF_INVALID_MESSAGE })
  cpf?: string;

  /** E-mail do responsável (Mercado Pago exige payer.email). */
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;
}
