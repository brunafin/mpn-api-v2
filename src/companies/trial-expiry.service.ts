import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { Company } from 'src/companies/entities/company.entity';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import {
  shouldExpireTrialCompany,
  TrialCompany,
} from 'src/companies/utils/trial-expiry';
import { PlanEnum } from 'src/plans/enum/enum';

const EXPIRED_TRIAL_PATCH = {
  partner_status: PartnerStatus.EXPIRED,
  plan_id: null,
  is_trial: false,
} as const;

@Injectable()
export class TrialExpiryService {
  private readonly logger = new Logger(TrialExpiryService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    private readonly publicListingCache: PublicListingCache,
  ) {}

  /** 03:00 — antes do cron de populate (04:00), para trial vencido não ganhar grade nova. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpireDueTrialsCron() {
    const expired = await this.expireDueTrials();
    this.logger.log(`Trial expiry cron: expired=${expired}`);
  }

  async expireDueTrials(): Promise<number> {
    const result = await this.companiesRepository
      .createQueryBuilder()
      .update(Company)
      .set({ ...EXPIRED_TRIAL_PATCH })
      .where('is_trial = true')
      .andWhere('trial_ends_at <= NOW()')
      .andWhere('partner_status = :active', {
        active: PartnerStatus.ACTIVE,
      })
      .andWhere('(plan_id IS NULL OR plan_id = :free)', {
        free: PlanEnum.FREE,
      })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.publicListingCache.clear();
    }
    return affected;
  }

  /** Persiste expire de uma company se o calendário já passou. Mutates in memory. */
  async expireCompanyIfNeeded(
    company: TrialCompany & { id: number },
  ): Promise<boolean> {
    if (!shouldExpireTrialCompany(company)) return false;

    await this.companiesRepository.update(
      { id: company.id },
      { ...EXPIRED_TRIAL_PATCH },
    );
    company.partner_status = PartnerStatus.EXPIRED;
    company.plan_id = null;
    company.is_trial = false;
    this.publicListingCache.clear();
    return true;
  }
}
