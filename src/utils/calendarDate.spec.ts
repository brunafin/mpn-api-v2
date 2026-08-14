import {
  addDaysToDateKey,
  dateKeyToUtcDate,
  eachDateKeyInclusive,
  toDateKey,
  todayDateKey,
  weekdayRefFromDateKey,
} from './calendarDate';

describe('calendarDate', () => {
  it('weekdayRefFromDateKey não desloca o dia (bug UTC midnight)', () => {
    // 2026-07-28 é terça (2). new Date('2026-07-28') em UTC−3 vira segunda.
    expect(weekdayRefFromDateKey('2026-07-28')).toBe(2);
    expect(new Date('2026-07-28').getTimezoneOffset()).toBeDefined();
  });

  it('toDateKey em Date de coluna date usa UTC', () => {
    expect(toDateKey(new Date(Date.UTC(2026, 6, 28)))).toBe('2026-07-28');
    expect(toDateKey('2026-07-28T15:00:00.000Z')).toBe('2026-07-28');
  });

  it('dateKeyToUtcDate round-trip com toDateKey', () => {
    expect(toDateKey(dateKeyToUtcDate('2026-07-28'))).toBe('2026-07-28');
  });

  it('dateKeyToUtcDate usa meio-dia UTC (evita D−1 em America/Sao_Paulo)', () => {
    const d = dateKeyToUtcDate('2026-08-14');
    expect(d.toISOString()).toBe('2026-08-14T12:00:00.000Z');
    // Meia-noite UTC seria 21h do dia anterior em São Paulo.
    expect(
      d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
    ).toMatch(/8\/14\/2026/);
  });

  it('eachDateKeyInclusive percorre dias civis', () => {
    expect(eachDateKeyInclusive('2026-07-28', '2026-07-30')).toEqual([
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
    ]);
  });

  it('addDaysToDateKey atravessa mês', () => {
    expect(addDaysToDateKey('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('todayDateKey retorna YYYY-MM-DD', () => {
    expect(todayDateKey(new Date('2026-07-28T15:00:00.000Z'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
