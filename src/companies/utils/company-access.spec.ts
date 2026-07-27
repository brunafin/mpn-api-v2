import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import {
  buildCapabilities,
  canMutateCompany,
  hasProductEntitlement,
  resolveEntitlement,
} from './company-access';

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

describe('company-access', () => {
  it('trial ativo tem entitlement e pode mutar', () => {
    const company = {
      partner_status: PartnerStatus.ACTIVE,
      plan_id: PlanEnum.FREE,
      trial_ends_at: future,
      access_mode: AccessMode.FULL,
    };
    expect(resolveEntitlement(company)).toBe('trial');
    expect(hasProductEntitlement(company)).toBe(true);
    expect(canMutateCompany(company)).toBe(true);
  });

  it('expired sem plano não tem produto', () => {
    const company = {
      partner_status: PartnerStatus.EXPIRED,
      plan_id: null,
      trial_ends_at: past,
      access_mode: AccessMode.FULL,
    };
    expect(resolveEntitlement(company)).toBe('none');
    expect(canMutateCompany(company)).toBe(false);
    expect(buildCapabilities(company).canViewAgenda).toBe(false);
  });

  it('pagante read_only vê agenda mas não muta e pode pagar', () => {
    const company = {
      partner_status: PartnerStatus.ACTIVE,
      plan_id: 10,
      trial_ends_at: null,
      access_mode: AccessMode.READ_ONLY,
      access_reason: 'delinquency',
    };
    const caps = buildCapabilities(company);
    expect(caps.entitlement).toBe('paid');
    expect(caps.canViewAgenda).toBe(true);
    expect(caps.canMutate).toBe(false);
    expect(caps.canPayBilling).toBe(true);
    expect(caps.portalEligible).toBe(true);
  });
});
