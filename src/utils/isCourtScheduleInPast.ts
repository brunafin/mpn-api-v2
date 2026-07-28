import { fromZonedTime } from 'date-fns-tz';
import { toDateKey } from './calendarDate';

const BRAZIL_TZ = 'America/Sao_Paulo';

/** True se o início do horário já passou (fuso America/Sao_Paulo). */
export function isCourtScheduleInPast(
  date: Date | string,
  startHour: string,
  now: Date = new Date(),
): boolean {
  const ymd = toDateKey(date);
  const hhmm = String(startHour).slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{2}:\d{2}$/.test(hhmm)) {
    return false;
  }
  const slotStart = fromZonedTime(`${ymd}T${hhmm}:00`, BRAZIL_TZ);
  return slotStart.getTime() <= now.getTime();
}
