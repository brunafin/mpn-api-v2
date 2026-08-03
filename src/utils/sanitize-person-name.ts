/** Limite alinhado ao `varchar(50)` das entidades de contato/cliente. */
export const PERSON_NAME_MAX_LENGTH = 50;

/**
 * Remove emojis/pictográficos e normaliza o nome do contato.
 * Evita erros de validação/DB por caracteres multi-codepoint.
 */
export function sanitizePersonName(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PERSON_NAME_MAX_LENGTH);
}
