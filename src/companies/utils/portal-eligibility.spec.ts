import { IsNull, Not } from 'typeorm';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import {
  andWhereNotStaleTrial,
  NOT_STALE_TRIAL,
  portalCompanyWhere,
} from './portal-eligibility';

describe('portal-eligibility', () => {
  it('portalCompanyWhere inclui filtro de trial stale e extras', () => {
    const where = portalCompanyWhere({ slug: 'arena' });
    expect(where).toMatchObject({
      is_active: true,
      partner_status: PartnerStatus.ACTIVE,
      access_mode: AccessMode.FULL,
      slug: 'arena',
      is_trial: NOT_STALE_TRIAL,
    });
    expect(where.plan_id).toEqual(Not(IsNull()));
  });

  it('andWhereNotStaleTrial acrescenta predicado de calendário', () => {
    const andWhere = jest.fn().mockReturnThis();
    const qb = { andWhere } as never;
    andWhereNotStaleTrial(qb, 'company');
    expect(andWhere).toHaveBeenCalledWith(
      '(company.is_trial = false OR company.trial_ends_at > NOW())',
    );
  });
});
