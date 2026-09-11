import { CostRecurrence } from './enums/cost-recurrence.enum';

/** Converte o valor cadastrado para equivalente mensal (única = 0). */
export function monthlyEquivalent(
  amount: number,
  recurrence: CostRecurrence,
): number {
  if (recurrence === CostRecurrence.MONTHLY) return amount;
  if (recurrence === CostRecurrence.YEARLY) return amount / 12;
  return 0;
}
