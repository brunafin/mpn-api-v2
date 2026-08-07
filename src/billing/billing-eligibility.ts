import {
  resolveEntitlement,
  type CompanyAccessSnapshot,
} from 'src/companies/utils/company-access';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { isCompanyOnTrial } from 'src/companies/utils/trial-expiry';

/** Elegível à mensalidade automática (cron). Trial nunca entra. */
export function isEligibleForAutoParcel(company: {
  partner_status: PartnerStatus | null | undefined;
  plan_id: number | null | undefined;
  is_trial?: boolean | null | undefined;
}): boolean {
  // Trial / teste: nunca gera mensalidade automática.
  if (isCompanyOnTrial(company)) return false;
  if (company.partner_status !== PartnerStatus.ACTIVE) return false;
  if (!company.plan_id) return false;
  // Plano FREE (período de teste), mesmo se is_trial estiver inconsistente.
  if (company.plan_id === PlanEnum.FREE) return false;
  return true;
}

/**
 * Precisa da 1ª vinculação comercial (ainda não é cliente pago).
 * Alinhado a `resolveEntitlement` — evita loop Planos ↔ Mensalidades.
 */
export function needsPlanActivation(
  company: CompanyAccessSnapshot,
): boolean {
  return resolveEntitlement(company) !== 'paid';
}
