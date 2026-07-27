import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { isTrialActive } from 'src/companies/utils/trial-expiry';

export type CompanyAccessSnapshot = {
  partner_status: PartnerStatus | null | undefined;
  plan_id: number | null | undefined;
  trial_ends_at: Date | null | undefined;
  access_mode?: AccessMode | string | null | undefined;
};

export type Entitlement = 'trial' | 'paid' | 'none';

export type CompanyCapabilities = {
  entitlement: Entitlement;
  accessMode: AccessMode;
  accessReason: string | null;
  /** Tem direito ao produto (agenda no manager). */
  canViewAgenda: boolean;
  /** Pode criar/editar/excluir no manager. */
  canMutate: boolean;
  /** Pode pagar mensalidade / gerar PIX. */
  canPayBilling: boolean;
  /** Elegível a aparecer no portal (ainda depende de court.show / is_active). */
  portalEligible: boolean;
};

export function resolveEntitlement(
  company: CompanyAccessSnapshot,
): Entitlement {
  if (company.partner_status === PartnerStatus.EXPIRED) return 'none';
  if (company.partner_status === PartnerStatus.INACTIVE) return 'none';
  if (company.plan_id == null) return 'none';

  if (company.plan_id === PlanEnum.FREE) {
    return isTrialActive(company.trial_ends_at) ? 'trial' : 'none';
  }

  if (company.partner_status === PartnerStatus.ACTIVE || !company.partner_status) {
    return 'paid';
  }

  return 'none';
}

export function resolveAccessMode(
  company: CompanyAccessSnapshot,
): AccessMode {
  return company.access_mode === AccessMode.READ_ONLY
    ? AccessMode.READ_ONLY
    : AccessMode.FULL;
}

export function hasProductEntitlement(
  company: CompanyAccessSnapshot,
): boolean {
  return resolveEntitlement(company) !== 'none';
}

export function canMutateCompany(company: CompanyAccessSnapshot): boolean {
  return (
    hasProductEntitlement(company) &&
    resolveAccessMode(company) === AccessMode.FULL
  );
}

export function canPayBilling(company: CompanyAccessSnapshot): boolean {
  return resolveEntitlement(company) === 'paid';
}

/** Portal: trial ativo ou plano promocional com partner active. */
export function isPortalEligible(company: CompanyAccessSnapshot): boolean {
  return hasProductEntitlement(company);
}

export function buildCapabilities(
  company: CompanyAccessSnapshot & { access_reason?: string | null },
): CompanyCapabilities {
  const entitlement = resolveEntitlement(company);
  const accessMode = resolveAccessMode(company);
  const hasProduct = entitlement !== 'none';

  return {
    entitlement,
    accessMode,
    accessReason: accessMode === AccessMode.READ_ONLY
      ? (company.access_reason ?? null)
      : null,
    canViewAgenda: hasProduct,
    canMutate: hasProduct && accessMode === AccessMode.FULL,
    canPayBilling: entitlement === 'paid',
    portalEligible: hasProduct,
  };
}
