/** Normaliza CPF para 11 dígitos ou null se inválido no formato. */
export function normalizeCpf(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
}
