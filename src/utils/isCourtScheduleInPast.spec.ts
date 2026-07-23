import { isCourtScheduleInPast } from './isCourtScheduleInPast';

describe('isCourtScheduleInPast', () => {
  it('marca horário de hoje já iniciado como passado', () => {
    const now = new Date('2026-07-22T15:30:00-03:00');
    expect(isCourtScheduleInPast('2026-07-22', '15:00', now)).toBe(true);
    expect(isCourtScheduleInPast('2026-07-22', '15:30', now)).toBe(true);
    expect(isCourtScheduleInPast('2026-07-22', '16:00', now)).toBe(false);
  });

  it('não marca horários de dias futuros', () => {
    const now = new Date('2026-07-22T23:00:00-03:00');
    expect(isCourtScheduleInPast('2026-07-23', '08:00', now)).toBe(false);
  });
});
