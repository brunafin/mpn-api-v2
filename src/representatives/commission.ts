import { format } from 'date-fns';

export type CommissionKind = 'first_month' | 'recurring';

export type CommissionPaymentInput = {
  id: number;
  price: number | string;
  dt_due: Date | string | null;
  dt_payment: Date | string | null;
};

export type CommissionRates = {
  firstMonthPercent: number;
  recurringPercent: number;
};

export type CommissionLine = {
  paymentId: number;
  dueDate: string | null;
  paidAt: string | null;
  paymentValue: number;
  percent: number;
  amount: number;
  kind: CommissionKind;
};

export type CommissionSummary = CommissionRates & {
  total: number;
  lines: CommissionLine[];
};

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(value: Date | string | null): string | null {
  const date = toDate(value);
  return date ? format(date, 'yyyy-MM-dd') : null;
}

/**
 * 1ª mensalidade paga (por vencimento) usa firstMonthPercent;
 * as seguintes usam recurringPercent. Só parcelas com dt_payment.
 */
export function computeCommissions(
  payments: CommissionPaymentInput[],
  rates: CommissionRates,
): CommissionSummary {
  const paid = [...payments]
    .filter((payment) => toDate(payment.dt_payment))
    .sort((a, b) => {
      const da = toDate(a.dt_due)?.getTime() ?? 0;
      const db = toDate(b.dt_due)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return a.id - b.id;
    });

  const lines = paid.map((payment, index) => {
    const percent =
      index === 0 ? rates.firstMonthPercent : rates.recurringPercent;
    const paymentValue = Number(payment.price);
    return {
      paymentId: payment.id,
      dueDate: toDateKey(payment.dt_due),
      paidAt: toDateKey(payment.dt_payment),
      paymentValue,
      percent,
      amount: Number(((paymentValue * percent) / 100).toFixed(2)),
      kind: (index === 0 ? 'first_month' : 'recurring') as CommissionKind,
    };
  });

  const total = Number(
    lines.reduce((sum, line) => sum + line.amount, 0).toFixed(2),
  );

  return {
    firstMonthPercent: rates.firstMonthPercent,
    recurringPercent: rates.recurringPercent,
    total,
    lines,
  };
}
