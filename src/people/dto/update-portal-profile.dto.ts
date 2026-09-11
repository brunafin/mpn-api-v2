import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsCpf } from 'src/utils/is-cpf.decorator';
import { CPF_INVALID_MESSAGE } from 'src/utils/normalize-cpf';

function emptyToNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function digitsOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length === 0 ? null : digits;
}

export class UpdatePortalProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9._-]{3,20}$/, {
    message: 'Usuário: 3 a 20 caracteres, sem espaços (letras, números, . _ -).',
  })
  username?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const next = emptyToNull(value);
    return typeof next === 'string' ? next.toLowerCase() : next;
  })
  @ValidateIf((_, value) => value != null)
  @IsEmail()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @Transform(({ value }) => digitsOrNull(value))
  @ValidateIf((_, value) => value != null)
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone deve ter 10 ou 11 dígitos.',
  })
  phone?: string | null;

  @IsOptional()
  @Transform(({ value }) => digitsOrNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @IsCpf({ message: CPF_INVALID_MESSAGE })
  cpf?: string | null;

  @IsOptional()
  @Transform(({ value }) => digitsOrNull(value))
  @ValidateIf((_, value) => value != null)
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos.' })
  cep?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(100)
  street?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(10)
  number?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(50)
  neighborhood?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(50)
  city?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    const next = emptyToNull(value);
    return typeof next === 'string' ? next.toUpperCase() : next;
  })
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'UF inválida.' })
  uf?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}
