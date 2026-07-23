import { IsDateString } from 'class-validator';

export class MarkPlatformPaymentPaidDto {
  /** Data do pagamento (YYYY-MM-DD ou ISO). */
  @IsDateString()
  paidAt: string;
}
