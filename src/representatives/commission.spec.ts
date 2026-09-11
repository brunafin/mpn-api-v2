import { computeCommissions } from './commission';

describe('computeCommissions', () => {
  const rates = { firstMonthPercent: 100, recurringPercent: 25 };

  it('1ª paga leva 100% e as seguintes 25%', () => {
    const result = computeCommissions(
      [
        {
          id: 2,
          price: 200,
          dt_due: new Date('2026-02-10'),
          dt_payment: new Date('2026-02-10'),
        },
        {
          id: 1,
          price: 200,
          dt_due: new Date('2026-01-10'),
          dt_payment: new Date('2026-01-10'),
        },
      ],
      rates,
    );

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      paymentId: 1,
      kind: 'first_month',
      percent: 100,
      amount: 200,
    });
    expect(result.lines[1]).toMatchObject({
      paymentId: 2,
      kind: 'recurring',
      percent: 25,
      amount: 50,
    });
    expect(result.total).toBe(250);
  });

  it('ignora parcelas em aberto', () => {
    const result = computeCommissions(
      [
        {
          id: 1,
          price: 100,
          dt_due: new Date('2026-01-10'),
          dt_payment: new Date('2026-01-10'),
        },
        {
          id: 2,
          price: 100,
          dt_due: new Date('2026-02-10'),
          dt_payment: null,
        },
      ],
      rates,
    );

    expect(result.lines).toHaveLength(1);
    expect(result.total).toBe(100);
  });

  it('respeita percentuais diferentes por representante', () => {
    const result = computeCommissions(
      [
        {
          id: 1,
          price: 400,
          dt_due: new Date('2026-01-10'),
          dt_payment: new Date('2026-01-10'),
        },
        {
          id: 2,
          price: 400,
          dt_due: new Date('2026-03-10'),
          dt_payment: new Date('2026-03-10'),
        },
      ],
      { firstMonthPercent: 50, recurringPercent: 10 },
    );

    expect(result.lines[0].amount).toBe(200);
    expect(result.lines[1].amount).toBe(40);
    expect(result.total).toBe(240);
  });
});
