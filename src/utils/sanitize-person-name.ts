/** Limite alinhado ao `varchar(50)` das entidades de contato/cliente. */
export const PERSON_NAME_MAX_LENGTH = 50;

/**
 * Caracteres permitidos no nome: letras (com acento), marcas diacríticas,
 * espaço, hífen e apóstrofo. Bloqueia emoji, emoticon e demais símbolos.
 */
const DISALLOWED_PERSON_NAME_CHARS_GLOBAL = /[^\p{L}\p{M}\s'\u2019\-]/gu;

/**
 * Remove emojis/pictográficos e normaliza o nome do contato.
 * Evita erros de validação/DB por caracteres multi-codepoint.
 */
export function sanitizePersonName(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(DISALLOWED_PERSON_NAME_CHARS_GLOBAL, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PERSON_NAME_MAX_LENGTH);
}
