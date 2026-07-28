import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { isEligibleForAutoParcel } from './billing-eligibility';

describe('isEligibleForAutoParcel', () => {
  const base = {
    partner_status: PartnerStatus.ACTIVE,
    plan_id: 99,
    is_trial: false,
  };

  it('aceita company ativa com plano pago e sem trial', () => {
    expect(isEligibleForAutoParcel(base)).toBe(true);
  });

  it('rejeita FREE, trial e não-active', () => {
    expect(
      isEligibleForAutoParcel({ ...base, plan_id: PlanEnum.FREE }),
    ).toBe(false);
    expect(isEligibleForAutoParcel({ ...base, is_trial: true })).toBe(false);
    expect(
      isEligibleForAutoParcel({
        ...base,
        partner_status: PartnerStatus.EXPIRED,
      }),
    ).toBe(false);
  });

  it('aceita pago mesmo com trial_ends_at futuro se is_trial=false', () => {
    expect(
      isEligibleForAutoParcel({
        ...base,
        is_trial: false,
      }),
    ).toBe(true);
  });
});
