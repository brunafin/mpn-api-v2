/**
 * Forma persistida do cadastro.
 * E-mail em minúsculas, telefone e CPF só com dígitos, CEP mascarado,
 * UF e endereço em maiúsculas. Nomes sem emoji e com um espaço só.
 */

function stripNoise(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D\u0000-\u001F\u007F]/g, '');
}

function collapse(value: string): string {
  return stripNoise(value).replace(/\s+/g, ' ').trim();
}

/** Nome da pessoa: letras, espaço, hífen e apóstrofo. */
export function normalizePersonName(value: string, max = 50): string {
  return collapse(value)
    .replace(/[^\p{L}\p{M}\s'\u2019\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Nome da quadra: cabe na agenda e no card. */
export const COURT_NAME_MAX_LENGTH = 8;

/** Nome de estabelecimento ou quadra. */
export function normalizeTitle(value: string, max: number): string {
  return collapse(value)
    .replace(/[^\p{L}\p{M}\p{N}\s'\u2019\-\.&]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Rua, bairro e cidade, no mesmo padrão do ViaCEP. */
export function normalizeAddressText(value: string, max: number): string {
  return collapse(value)
    .replace(/[^\p{L}\p{M}\p{N}\s'\u2019\-.,/ºª]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, max);
}

export function normalizeUf(value: string): string {
  return (value ?? '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
}

export function normalizeAddressNumber(value: string): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 10);
}

/** Até 11 dígitos. Vazio vira undefined. */
export function normalizePhoneDigits(
  value?: string | null,
): string | undefined {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  return digits || undefined;
}

/** `00000-000` quando há 8 dígitos. */
export function normalizeCepStored(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function normalizeEmail(value: string): string {
  return (value ?? '').trim().toLowerCase();
}

/** @handle ou URL vira https://instagram.com/handle em minúsculas. */
export function normalizeInstagramUrl(
  value?: string | null,
): string | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return undefined;

  let handle = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      handle = new URL(trimmed).pathname.replace(/^\//, '').split('/')[0] ?? '';
    } catch {
      return trimmed.slice(0, 200);
    }
  }

  handle = handle
    .replace(/^@/, '')
    .replace(/^instagram\.com\//i, '')
    .toLowerCase();

  if (!/^[a-z0-9._]{1,30}$/.test(handle)) {
    return trimmed.slice(0, 200);
  }
  return `https://instagram.com/${handle}`;
}
