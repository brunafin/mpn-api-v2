import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { isEligibleForAutoParcel } from './billing-eligibility';

describe('isEligibleForAutoParcel', () => {
  const base = {
    partner_status: PartnerStatus.ACTIVE,
    plan_id: 99,
    trial_ends_at: null as Date | null,
  };

  it('aceita company ativa com plano pago e sem trial', () => {
    expect(isEligibleForAutoParcel(base)).toBe(true);
  });

  it('rejeita FREE, trial e não-active', () => {
    expect(
      isEligibleForAutoParcel({ ...base, plan_id: PlanEnum.FREE }),
    ).toBe(false);
    expect(
      isEligibleForAutoParcel({
        ...base,
        trial_ends_at: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(false);
    expect(
      isEligibleForAutoParcel({
        ...base,
        partner_status: PartnerStatus.EXPIRED,
      }),
    ).toBe(false);
  });
});
