import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';

export type TrialCompany = {
  is_trial: boolean | null | undefined;
  trial_ends_at: Date | string;
  partner_status: PartnerStatus | null | undefined;
  plan_id: number | null | undefined;
};

/** Fonte da verdade: company marcada como trial. */
export function isCompanyOnTrial(company: {
  is_trial?: boolean | null;
}): boolean {
  return Boolean(company.is_trial);
}

/** Data do trial ainda no futuro (só calendário; não decide entitlement). */
export function isTrialEndInFuture(
  trialEndsAt: Date | string | null | undefined,
): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

/**
 * Encerra o trial preservando histórico:
 * - is_trial = false
 * - se a data ainda era futura, antecipa para agora (expirou na conversão/encerramento)
 */
export function endCompanyTrial<T extends {
  is_trial: boolean;
  trial_ends_at: Date;
}>(company: T, endedAt = new Date()): T {
  company.is_trial = false;
  if (isTrialEndInFuture(company.trial_ends_at)) {
    company.trial_ends_at = endedAt;
  }
  return company;
}

/**
 * Trial vencido (flag ainda true, data no passado) → vira expired sem plano.
 * Não depende mais de null na data.
 */
export function shouldExpireTrialCompany(company: TrialCompany): boolean {
  if (!isCompanyOnTrial(company)) return false;
  if (company.partner_status === PartnerStatus.EXPIRED) return false;
  if (company.partner_status === PartnerStatus.INACTIVE) return false;
  if (isTrialEndInFuture(company.trial_ends_at)) return false;
  // Plano pago com is_trial inconsistente: não expirar por esta rota.
  if (company.plan_id != null && company.plan_id !== PlanEnum.FREE) {
    return false;
  }
  return true;
}

/** @deprecated Use isCompanyOnTrial / isTrialEndInFuture. */
export function isTrialActive(
  trialEndsAt: Date | null | undefined,
): boolean {
  return isTrialEndInFuture(trialEndsAt);
}
