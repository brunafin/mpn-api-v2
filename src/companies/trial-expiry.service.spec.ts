import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { Company } from 'src/companies/entities/company.entity';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import { TrialExpiryService } from './trial-expiry.service';

describe('TrialExpiryService', () => {
  let service: TrialExpiryService;
  let execute: jest.Mock;
  let update: jest.Mock;
  let publicListingCache: { clear: jest.Mock };

  beforeEach(async () => {
    execute = jest.fn().mockResolvedValue({ affected: 0 });
    update = jest.fn().mockResolvedValue({ affected: 1 });
    publicListingCache = { clear: jest.fn() };

    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialExpiryService,
        {
          provide: getRepositoryToken(Company),
          useValue: {
            createQueryBuilder: jest.fn(() => qb),
            update,
          },
        },
        { provide: PublicListingCache, useValue: publicListingCache },
      ],
    }).compile();

    service = module.get(TrialExpiryService);
  });

  it('expireDueTrials limpa cache só quando afetou linhas', async () => {
    execute.mockResolvedValueOnce({ affected: 2 });

    await expect(service.expireDueTrials()).resolves.toBe(2);
    expect(publicListingCache.clear).toHaveBeenCalledTimes(1);

    await expect(service.expireDueTrials()).resolves.toBe(0);
    expect(publicListingCache.clear).toHaveBeenCalledTimes(1);
  });

  it('expireCompanyIfNeeded persiste EXPIRED e limpa listing', async () => {
    const company = {
      id: 9,
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 60_000),
      partner_status: PartnerStatus.ACTIVE,
      plan_id: PlanEnum.FREE,
    };

    await expect(service.expireCompanyIfNeeded(company)).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      { id: 9 },
      {
        partner_status: PartnerStatus.EXPIRED,
        plan_id: null,
        is_trial: false,
      },
    );
    expect(company.partner_status).toBe(PartnerStatus.EXPIRED);
    expect(company.is_trial).toBe(false);
    expect(company.plan_id).toBeNull();
    expect(publicListingCache.clear).toHaveBeenCalled();
  });

  it('expireCompanyIfNeeded não grava trial ainda vigente', async () => {
    const company = {
      id: 9,
      is_trial: true,
      trial_ends_at: new Date(Date.now() + 86_400_000),
      partner_status: PartnerStatus.ACTIVE,
      plan_id: PlanEnum.FREE,
    };

    await expect(service.expireCompanyIfNeeded(company)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(publicListingCache.clear).not.toHaveBeenCalled();
  });
});
