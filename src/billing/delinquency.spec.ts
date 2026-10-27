import {
  addCalendarDays,
  daysAfter,
  formatCalendarDate,
  isDelinquencyReminderDay,
  shouldSuspendForDelinquency,
} from './delinquency';

const due = { year: 2026, month: 10, day: 1 };

describe('inadimplência por dias após o vencimento', () => {
  it('lembra todo dia do 3º ao 9º e em nenhum outro', () => {
    for (let offset = 0; offset <= 12; offset += 1) {
      const today = addCalendarDays(due, offset);
      const elapsed = daysAfter(due, today);
      expect(elapsed).toBe(offset);
      expect(isDelinquencyReminderDay(elapsed)).toBe(offset >= 3 && offset <= 9);
    }
  });

  it('com 20 dias, lembra até a véspera e suspende no 20º', () => {
    expect(isDelinquencyReminderDay(14, 20)).toBe(true);
    expect(isDelinquencyReminderDay(19, 20)).toBe(true);
    expect(isDelinquencyReminderDay(20, 20)).toBe(false);
    expect(shouldSuspendForDelinquency(14, 20)).toBe(false);
    expect(shouldSuspendForDelinquency(20, 20)).toBe(true);
  });

  it('suspende a partir do 10º dia', () => {
    expect(shouldSuspendForDelinquency(9)).toBe(false);
    expect(shouldSuspendForDelinquency(10)).toBe(true);
    expect(shouldSuspendForDelinquency(15)).toBe(true);
  });

  it('a data do bloqueio é o vencimento mais 10 dias', () => {
    expect(formatCalendarDate(addCalendarDays(due, 10))).toBe('2026-10-11');
    expect(
      formatCalendarDate(addCalendarDays({ year: 2026, month: 10, day: 25 }, 10)),
    ).toBe('2026-11-04');
  });
});
