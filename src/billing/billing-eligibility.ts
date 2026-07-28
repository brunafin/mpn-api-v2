import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { isCompanyOnTrial } from 'src/companies/utils/trial-expiry';

/** Espelha a regra do BillingService.isEligibleForAutoParcel (teste unitário puro). */
export function isEligibleForAutoParcel(company: {
  partner_status: PartnerStatus | null | undefined;
  plan_id: number | null | undefined;
  is_trial?: boolean | null | undefined;
}): boolean {
  if (company.partner_status !== PartnerStatus.ACTIVE) return false;
  if (!company.plan_id) return false;
  if (company.plan_id === PlanEnum.FREE) return false;
  if (isCompanyOnTrial(company)) return false;
  return true;
}
