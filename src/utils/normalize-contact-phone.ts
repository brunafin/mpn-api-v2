/**
 * Normaliza telefone de contato da agenda.
 * Retorna null quando vazio — não usa telefone da arena como fallback.
 */
export function normalizeOptionalContactPhone(
  raw?: string | null,
): string | null {
  let phone = (raw ?? '').replace(/\s+/g, '');
  if (phone.length === 9 && phone.startsWith('9')) {
    phone = '51' + phone;
  }
  return phone || null;
}

/** Para `reservations.contact_phone` (NOT NULL char/varchar): vazio vira ''. */
export function normalizeReservationContactPhone(
  raw?: string | null,
): string {
  return normalizeOptionalContactPhone(raw) ?? '';
}
