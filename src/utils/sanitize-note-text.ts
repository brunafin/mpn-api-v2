/** Limite alinhado ao DTO de observação da reserva. */
export const OBSERVATION_MAX_LENGTH = 150;

/** Limite alinhado ao DTO de mensagem de lembrete. */
export const NOTE_MESSAGE_MAX_LENGTH = 255;

/**
 * Caracteres permitidos em observação/lembrete: letras (com acento),
 * números, espaço, @ e pontuação básica. Bloqueia emoji, emoticon e
 * demais símbolos — mesmo critério do nome, com @ e dígitos liberados.
 */
const DISALLOWED_NOTE_TEXT_CHARS_GLOBAL =
  /[^\p{L}\p{M}\p{N}\s@.,!?;:'"\u2018\u2019\u201C\u201D\-–—()\/]/gu;

/**
 * Remove emojis/pictográficos e normaliza texto livre (observação/lembrete).
 */
export function sanitizeNoteText(
  value: string,
  maxLength: number = OBSERVATION_MAX_LENGTH,
): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(DISALLOWED_NOTE_TEXT_CHARS_GLOBAL, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}
