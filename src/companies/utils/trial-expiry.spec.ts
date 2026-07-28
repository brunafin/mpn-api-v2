import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import {
  endCompanyTrial,
  isCompanyOnTrial,
  isTrialEndInFuture,
  shouldExpireTrialCompany,
} from './trial-expiry';

describe('trial-expiry', () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it('isCompanyOnTrial usa a flag', () => {
    expect(isCompanyOnTrial({ is_trial: true })).toBe(true);
    expect(isCompanyOnTrial({ is_trial: false })).toBe(false);
  });

  it('endCompanyTrial desliga flag e antecipa data futura', () => {
    const company = { is_trial: true, trial_ends_at: future };
    endCompanyTrial(company);
    expect(company.is_trial).toBe(false);
    expect(isTrialEndInFuture(company.trial_ends_at)).toBe(false);
  });

  it('endCompanyTrial preserva data já passada', () => {
    const company = { is_trial: true, trial_ends_at: past };
    endCompanyTrial(company);
    expect(company.is_trial).toBe(false);
    expect(company.trial_ends_at).toBe(past);
  });

  it('shouldExpireTrialCompany só com flag true e data passada', () => {
    expect(
      shouldExpireTrialCompany({
        is_trial: true,
        trial_ends_at: past,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: PlanEnum.FREE,
      }),
    ).toBe(true);

    expect(
      shouldExpireTrialCompany({
        is_trial: false,
        trial_ends_at: past,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: PlanEnum.FREE,
      }),
    ).toBe(false);

    expect(
      shouldExpireTrialCompany({
        is_trial: true,
        trial_ends_at: future,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: PlanEnum.FREE,
      }),
    ).toBe(false);
  });
});
