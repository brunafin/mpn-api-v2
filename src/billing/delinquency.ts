/** Lembrete diário a partir do 3º dia depois do vencimento, até a véspera do bloqueio. */
export const DELINQUENCY_REMINDER_FROM_DAY = 3;

/** Padrão: somente leitura a partir do 10º dia depois do vencimento. O admin pode alterar. */
export const DELINQUENCY_BLOCK_AFTER_DAYS = 10;

/** O bloqueio precisa ser depois do primeiro dia de aviso. */
export const DELINQUENCY_BLOCK_AFTER_DAYS_MIN = DELINQUENCY_REMINDER_FROM_DAY + 1;

export const DELINQUENCY_BLOCK_AFTER_DAYS_MAX = 60;

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export function daysAfter(due: CalendarDate, today: CalendarDate): number {
  const from = Date.UTC(due.year, due.month - 1, due.day);
  const to = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((to - from) / 86_400_000);
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function formatCalendarDate(date: CalendarDate): string {
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${date.year}-${month}-${day}`;
}

export function isDelinquencyReminderDay(
  daysAfterDue: number,
  blockAfterDays = DELINQUENCY_BLOCK_AFTER_DAYS,
): boolean {
  return (
    daysAfterDue >= DELINQUENCY_REMINDER_FROM_DAY &&
    daysAfterDue < blockAfterDays
  );
}

export function shouldSuspendForDelinquency(
  daysAfterDue: number,
  blockAfterDays = DELINQUENCY_BLOCK_AFTER_DAYS,
): boolean {
  return daysAfterDue >= blockAfterDays;
}
