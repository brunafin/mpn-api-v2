import { fromZonedTime } from 'date-fns-tz';

const BRAZIL_TZ = 'America/Sao_Paulo';

function toYmd(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  // Coluna `date` (sem horário): usar UTC para não mudar o dia por fuso do servidor
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True se o início do horário já passou (fuso America/Sao_Paulo). */
export function isCourtScheduleInPast(
  date: Date | string,
  startHour: string,
  now: Date = new Date(),
): boolean {
  const ymd = toYmd(date);
  const hhmm = String(startHour).slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{2}:\d{2}$/.test(hhmm)) {
    return false;
  }
  const slotStart = fromZonedTime(`${ymd}T${hhmm}:00`, BRAZIL_TZ);
  return slotStart.getTime() <= now.getTime();
}
