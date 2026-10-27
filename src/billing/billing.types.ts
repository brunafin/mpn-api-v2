export type BillingPaymentStatus =
  | 'open'
  | 'overdue'
  | 'awaiting_pix'
  | 'paid';

export type BillingPaymentItem = {
  id: number;
  dueDate: string | null;
  paidAt: string | null;
  value: number;
  paid: boolean;
  status: BillingPaymentStatus;
  formOfPayment: string | null;
  mpPaymentId: string | null;
  hasCpfOnFile: boolean;
};

export type DelinquencyReminder = {
  paymentId: number;
  /** yyyy-MM-dd do vencimento. */
  dueDate: string;
  /** yyyy-MM-dd em que a agenda passa a somente leitura. */
  suspendsOn: string;
  /** Dias corridos depois do vencimento. */
  daysAfterDue: number;
};

export type BillingSummary = {
  openPayment: BillingPaymentItem | null;
  history: BillingPaymentItem[];
  monthlyFee: number;
  dayDue: number | null;
  isTrial: boolean;
  /** ISO da data de fim do teste. */
  trialEndsAt: string;
  pixEnabled: boolean;
  /** Preenchido do 3º dia até a véspera do bloqueio. No dia do bloqueio fica nulo. */
  delinquencyReminder: DelinquencyReminder | null;
};

export type BillingPixPayload = {
  paymentId: number;
  value: number;
  status: BillingPaymentStatus;
  paid: boolean;
  pixCopyPaste: string | null;
  pixQrBase64: string | null;
  pixExpiresAt: string | null;
  mpPaymentId: string | null;
};
