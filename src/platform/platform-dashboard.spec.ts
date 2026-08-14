import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import {
  brazilDayWindow,
  brazilLastDaysWindow,
  brazilMonthWindow,
  pickRecentLogins,
  summarizeDashboardCompanies,
} from './platform-dashboard';

describe('platform-dashboard', () => {
  const now = new Date('2026-08-14T15:00:00.000Z');

  it('brazilDayWindow cobre o dia civil em America/Sao_Paulo', () => {
    const { start, end } = brazilDayWindow(now);
    expect(start.toISOString()).toBe('2026-08-14T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-15T03:00:00.000Z');
  });

  it('brazilLastDaysWindow inclui os últimos 7 dias civis', () => {
    const { start, end } = brazilLastDaysWindow(now, 7);
    expect(start.toISOString()).toBe('2026-08-08T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-15T03:00:00.000Z');
  });

  it('brazilMonthWindow cobre o mês civil', () => {
    const { start, end } = brazilMonthWindow(now);
    expect(start.toISOString()).toBe('2026-08-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T03:00:00.000Z');
  });

  it('summarizeDashboardCompanies separa ativas, trial e expirados', () => {
    const summary = summarizeDashboardCompanies(
      [
        {
          public_id: 'pay',
          name: 'Paga',
          partner_status: PartnerStatus.ACTIVE,
          is_trial: false,
          trial_ends_at: '2026-01-01T00:00:00.000Z',
          plan: { base_price: 100, price_per_court: 10 },
          courts: [{}, {}],
        },
        {
          public_id: 'trial',
          name: 'Teste',
          partner_status: PartnerStatus.ACTIVE,
          is_trial: true,
          trial_ends_at: '2026-08-16T12:00:00.000Z',
          plan: { base_price: 100, price_per_court: 10 },
          courts: [{}],
        },
        {
          public_id: 'expired',
          name: 'Expirada',
          partner_status: PartnerStatus.EXPIRED,
          is_trial: false,
          trial_ends_at: '2026-08-01T00:00:00.000Z',
          plan: { base_price: 100, price_per_court: 10 },
          courts: [{}],
        },
      ],
      now,
    );

    expect(summary).toMatchObject({
      courts: 4,
      activeCourts: 2,
      trialCourts: 1,
      expiredArenas: 1,
      monthlyRevenue: 110,
    });
    expect(summary.trialsEndingSoon).toEqual([
      {
        publicId: 'trial',
        name: 'Teste',
        trialEndsAt: '2026-08-16T12:00:00.000Z',
        courtsCount: 1,
      },
    ]);
  });

  it('não lista trial que vence depois de 7 dias', () => {
    const summary = summarizeDashboardCompanies(
      [
        {
          public_id: 'later',
          name: 'Depois',
          partner_status: PartnerStatus.ACTIVE,
          is_trial: true,
          trial_ends_at: '2026-08-22T12:00:00.000Z',
          courts: [{}],
        },
      ],
      now,
    );
    expect(summary.trialsEndingSoon).toEqual([]);
  });

  it('pickRecentLogins ordena por acesso e usa arena quando houver', () => {
    expect(
      pickRecentLogins(
        [
          {
            public_id: 'onboarding',
            name: 'Ana',
            last_login_at: '2026-08-14T10:00:00.000Z',
            companies: [],
          },
          {
            public_id: 'owner',
            name: 'Bruno',
            last_login_at: '2026-08-14T12:00:00.000Z',
            companies: [{ public_id: 'arena-1', name: 'Arena Central' }],
          },
          {
            public_id: 'old',
            name: 'Carla',
            last_login_at: null,
          },
        ],
        8,
      ),
    ).toEqual([
      {
        publicId: 'arena-1',
        ownerName: 'Bruno',
        arenaName: 'Arena Central',
        lastLoginAt: '2026-08-14T12:00:00.000Z',
      },
      {
        publicId: 'onboarding',
        ownerName: 'Ana',
        arenaName: null,
        lastLoginAt: '2026-08-14T10:00:00.000Z',
      },
    ]);
  });
});
