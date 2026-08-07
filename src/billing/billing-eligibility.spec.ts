import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import {
  isEligibleForAutoParcel,
  needsPlanActivation,
} from './billing-eligibility';

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
        plan_id: PlanEnum.FREE,
        is_trial: true,
      }),
    ).toBe(false);
    expect(
      isEligibleForAutoParcel({
        ...base,
        partner_status: PartnerStatus.EXPIRED,
      }),
    ).toBe(false);
  });

  it('rejeita is_trial mesmo com plano comercial', () => {
    expect(
      isEligibleForAutoParcel({
        ...base,
        plan_id: 99,
        is_trial: true,
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

describe('needsPlanActivation', () => {
  const paid = {
    partner_status: PartnerStatus.ACTIVE,
    plan_id: 99,
    is_trial: false,
  };

  it('pago ativo não precisa ativar (usa Mensalidades / parcela aberta)', () => {
    expect(needsPlanActivation(paid)).toBe(false);
  });

  it('trial / expired / FREE precisam ativar', () => {
    expect(needsPlanActivation({ ...paid, is_trial: true })).toBe(true);
    expect(
      needsPlanActivation({
        ...paid,
        partner_status: PartnerStatus.EXPIRED,
        plan_id: null,
      }),
    ).toBe(true);
    expect(
      needsPlanActivation({ ...paid, plan_id: PlanEnum.FREE }),
    ).toBe(true);
  });

  it('plano residual com onboarding ainda precisa contratar (não é paid)', () => {
    // Antes: needsPlanActivation=false e entitlement=none → loop Planos↔Mensalidades.
    expect(
      needsPlanActivation({
        partner_status: PartnerStatus.ONBOARDING,
        plan_id: 99,
        is_trial: false,
      }),
    ).toBe(true);
  });

  it('partner_status null com plano comercial é tratado como pago', () => {
    expect(
      needsPlanActivation({
        partner_status: null,
        plan_id: 99,
        is_trial: false,
      }),
    ).toBe(false);
  });
});
