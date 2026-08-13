/** Mensagem estável para UI e API quando o CPF não passa no dígito verificador. */
export const CPF_INVALID_MESSAGE = 'Informe um CPF válido.';

export function cpfDigits(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Valida CPF brasileiro (11 dígitos + dígitos verificadores).
 * Rejeita sequências repetidas (00000000000, 11111111111, …).
 * Deve espelhar mpn-manager/src/utils/formatCpf.ts.
 */
export function isValidCpf(value: string | null | undefined): boolean {
  const digits = cpfDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (base: string, factor: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (factor - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  if (checkDigit(digits.slice(0, 9), 10) !== Number(digits[9])) return false;
  return checkDigit(digits.slice(0, 10), 11) === Number(digits[10]);
}

/** Normaliza CPF para 11 dígitos ou null se inválido. */
export function normalizeCpf(value: string | null | undefined): string | null {
  if (!isValidCpf(value)) return null;
  return cpfDigits(value);
}
