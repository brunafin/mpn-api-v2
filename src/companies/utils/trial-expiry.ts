import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';

type TrialCompany = {
  trial_ends_at: Date | null | undefined;
  partner_status: PartnerStatus | null | undefined;
  plan_id: number | null | undefined;
};

export function isTrialActive(
  trialEndsAt: Date | null | undefined,
): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

/** Trial vencido em plano gratuito (ou sem plano) → vira expired sem plano. */
export function shouldExpireTrialCompany(company: TrialCompany): boolean {
  if (company.partner_status === PartnerStatus.EXPIRED) return false;
  if (company.partner_status === PartnerStatus.INACTIVE) return false;
  if (isTrialActive(company.trial_ends_at)) return false;
  if (!company.trial_ends_at) return false;
  if (company.plan_id != null && company.plan_id !== PlanEnum.FREE) {
    return false;
  }
  return true;
}
