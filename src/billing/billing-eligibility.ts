import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { isTrialActive } from 'src/companies/utils/trial-expiry';

/** Espelha a regra do BillingService.isEligibleForAutoParcel (teste unitário puro). */
export function isEligibleForAutoParcel(company: {
  partner_status: PartnerStatus | null | undefined;
  plan_id: number | null | undefined;
  trial_ends_at: Date | null | undefined;
}): boolean {
  if (company.partner_status !== PartnerStatus.ACTIVE) return false;
  if (!company.plan_id) return false;
  if (
    company.plan_id === PlanEnum.FREE ||
    company.plan_id === PlanEnum.PENDENCE
  ) {
    return false;
  }
  if (isTrialActive(company.trial_ends_at)) return false;
  return true;
}
