import { formatInTimeZone } from 'date-fns-tz';

export const BRAZIL_TZ = 'America/Sao_Paulo';

/**
 * Normaliza para YYYY-MM-DD.
 * Para coluna PG `date` (Date sem horário), usa componentes UTC para não
 * deslocar o dia em America/Sao_Paulo.
 */
export function toDateKey(date?: Date | string): string {
  if (!date) {
    return todayDateKey();
  }
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hoje civil em America/Sao_Paulo. */
export function todayDateKey(now: Date = new Date()): string {
  return formatInTimeZone(now, BRAZIL_TZ, 'yyyy-MM-dd');
}

export function parseDateKeyParts(dateKey: string): {
  y: number;
  m: number;
  d: number;
} {
  const [y, m, d] = dateKey.slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Data inválida: ${dateKey}`);
  }
  return { y, m, d };
}

/**
 * getDay() (0=Dom … 6=Sáb) do calendário YYYY-MM-DD.
 * Evita `new Date('YYYY-MM-DD')` (UTC midnight → D-1 em UTC−3).
 */
export function weekdayRefFromDateKey(dateKey: string): number {
  const { y, m, d } = parseDateKeyParts(dateKey);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Instant para coluna PG `date` (via node-pg / TypeORM).
 *
 * Não usar meia-noite UTC: com TZ=America/Sao_Paulo o driver serializa em
 * horário local e `2026-08-14T00:00:00.000Z` vira **13/08** (D−1).
 * Meio-dia UTC permanece no mesmo dia civil no Brasil (e na leitura com getUTC*).
 */
export function dateKeyToUtcDate(dateKey: string): Date {
  const { y, m, d } = parseDateKeyParts(dateKey);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const { y, m, d } = parseDateKeyParts(dateKey);
  return toDateKey(new Date(Date.UTC(y, m - 1, d + days)));
}

export function eachDateKeyInclusive(
  startKey: string,
  endKey: string,
): string[] {
  const keys: string[] = [];
  let current = startKey.slice(0, 10);
  const end = endKey.slice(0, 10);
  while (current <= end) {
    keys.push(current);
    current = addDaysToDateKey(current, 1);
  }
  return keys;
}
