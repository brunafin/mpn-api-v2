import { CostRecurrence } from './enums/cost-recurrence.enum';
import { monthlyEquivalent } from './monthly-equivalent';

describe('monthlyEquivalent', () => {
  it('mantém valor mensal', () => {
    expect(monthlyEquivalent(100, CostRecurrence.MONTHLY)).toBe(100);
  });

  it('divide anual por 12', () => {
    expect(monthlyEquivalent(1200, CostRecurrence.YEARLY)).toBe(100);
  });

  it('custo único não entra no mensal', () => {
    expect(monthlyEquivalent(500, CostRecurrence.ONCE)).toBe(0);
  });
});
