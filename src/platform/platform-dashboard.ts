import { addDays, addMonths, startOfDay, startOfMonth } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { isCompanyOnTrial } from 'src/companies/utils/trial-expiry';
import { computeMonthlyFee } from 'src/plans/utils/compute-monthly-fee';
import { BRAZIL_TZ } from 'src/utils/calendarDate';

const TRIAL_ENDING_SOON_DAYS = 7;
export const RECENT_LOGINS_LIMIT = 8;

export type DashboardCompanyInput = {
  public_id: string;
  name: string;
  partner_status: PartnerStatus | null | undefined;
  is_trial?: boolean | null;
  trial_ends_at: Date | string | null;
  plan?: {
    base_price?: number | string | null;
    price_per_court?: number | string | null;
  } | null;
  courts?: unknown[] | null;
};

export type DashboardTrialEndingSoon = {
  publicId: string;
  name: string;
  trialEndsAt: string;
  courtsCount: number;
};

export type DashboardCompanySummary = {
  courts: number;
  activeCourts: number;
  trialCourts: number;
  expiredArenas: number;
  monthlyRevenue: number;
  trialsEndingSoon: DashboardTrialEndingSoon[];
};

export type DashboardRecentLoginInput = {
  public_id: string;
  name: string;
  last_login_at: Date | string | null;
  companies?: Array<{ public_id: string; name: string }> | null;
};

export type DashboardRecentLogin = {
  publicId: string;
  ownerName: string;
  arenaName: string | null;
  lastLoginAt: string;
};

export function pickRecentLogins(
  people: DashboardRecentLoginInput[],
  limit = RECENT_LOGINS_LIMIT,
): DashboardRecentLogin[] {
  return people
    .filter((person) => person.last_login_at)
    .sort(
      (a, b) =>
        new Date(b.last_login_at as Date | string).getTime() -
        new Date(a.last_login_at as Date | string).getTime(),
    )
    .slice(0, limit)
    .map((person) => {
      const company = person.companies?.[0] ?? null;
      return {
        publicId: company?.public_id ?? person.public_id,
        ownerName: person.name?.trim() || 'Sem nome',
        arenaName: company?.name ?? null,
        lastLoginAt: new Date(person.last_login_at as Date | string).toISOString(),
      };
    });
}

export function brazilZonedStartOfDay(now: Date): Date {
  const zoned = toZonedTime(now, BRAZIL_TZ);
  return fromZonedTime(startOfDay(zoned), BRAZIL_TZ);
}

export function brazilDayWindow(now: Date): { start: Date; end: Date } {
  const start = brazilZonedStartOfDay(now);
  return { start, end: addDays(start, 1) };
}

/** Janela inclusiva dos últimos `days` dias civis (hoje conta). */
export function brazilLastDaysWindow(
  now: Date,
  days: number,
): { start: Date; end: Date } {
  const today = brazilZonedStartOfDay(now);
  return { start: addDays(today, 1 - days), end: addDays(today, 1) };
}

export function brazilMonthWindow(now: Date): { start: Date; end: Date } {
  const zoned = toZonedTime(now, BRAZIL_TZ);
  const monthStart = startOfMonth(zoned);
  return {
    start: fromZonedTime(monthStart, BRAZIL_TZ),
    end: fromZonedTime(addMonths(monthStart, 1), BRAZIL_TZ),
  };
}

export function summarizeDashboardCompanies(
  companies: DashboardCompanyInput[],
  now: Date = new Date(),
): DashboardCompanySummary {
  const until = new Date(
    now.getTime() + TRIAL_ENDING_SOON_DAYS * 24 * 60 * 60 * 1000,
  );
  const trialsEndingSoon: DashboardTrialEndingSoon[] = [];

  let courts = 0;
  let activeCourts = 0;
  let trialCourts = 0;
  let expiredArenas = 0;
  let monthlyRevenue = 0;

  for (const company of companies) {
    const courtsCount = company.courts?.length ?? 0;
    const partnerStatus = company.partner_status ?? PartnerStatus.ACTIVE;
    const expired = partnerStatus === PartnerStatus.EXPIRED;
    const isTrial = isCompanyOnTrial(company) && !expired;
    const monthlyFee = expired
      ? 0
      : computeMonthlyFee({
          basePrice: company.plan?.base_price,
          pricePerCourt: company.plan?.price_per_court,
          courtsCount,
          isTrial,
        });

    courts += courtsCount;
    if (expired) expiredArenas += 1;
    if (isTrial) trialCourts += courtsCount;
    if (partnerStatus === PartnerStatus.ACTIVE && !isTrial) {
      activeCourts += courtsCount;
      monthlyRevenue += monthlyFee;
    }

    const trialEndsAt = company.trial_ends_at
      ? new Date(company.trial_ends_at)
      : null;
    if (
      isTrial &&
      trialEndsAt &&
      trialEndsAt.getTime() >= now.getTime() &&
      trialEndsAt.getTime() < until.getTime()
    ) {
      trialsEndingSoon.push({
        publicId: company.public_id,
        name: company.name,
        trialEndsAt: trialEndsAt.toISOString(),
        courtsCount,
      });
    }
  }

  trialsEndingSoon.sort(
    (a, b) =>
      new Date(a.trialEndsAt).getTime() - new Date(b.trialEndsAt).getTime(),
  );

  return {
    courts,
    activeCourts,
    trialCourts,
    expiredArenas,
    monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
    trialsEndingSoon,
  };
}
