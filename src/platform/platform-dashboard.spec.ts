import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import {
  brazilDayWindow,
  brazilLastDaysWindow,
  brazilMonthWindow,
  excludeViewerLogins,
  pickLoginsSince,
  pickOverdueClients,
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
          administrator_id: 1,
          partner_status: PartnerStatus.ACTIVE,
          is_trial: false,
          trial_ends_at: '2026-01-01T00:00:00.000Z',
          plan: { base_price: 100, price_per_court: 10 },
          courts: [{}, {}],
        },
        {
          public_id: 'trial',
          name: 'Teste',
          administrator_id: 2,
          partner_status: PartnerStatus.ACTIVE,
          is_trial: true,
          trial_ends_at: '2026-08-16T12:00:00.000Z',
          plan: { base_price: 100, price_per_court: 10 },
          courts: [{}],
        },
        {
          public_id: 'expired',
          name: 'Expirada',
          administrator_id: 1,
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
      arenas: 3,
      arenaOwners: 2,
      activeArenas: 1,
      trialArenas: 1,
      expiredArenas: 1,
      monthlyRevenue: 110,
    });
    expect(summary.trialsEndingSoon).toEqual([
      {
        publicId: 'trial',
        name: 'Teste',
        trialEndsAt: '2026-08-16T12:00:00.000Z',
        courtsCount: 1,
        ownerName: null,
        phone: null,
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

  it('pickOverdueClients agrupa parcelas vencidas e ignora PIX em andamento', () => {
    const now = new Date('2026-10-21T15:00:00.000Z');
    const clients = pickOverdueClients(
      [
        {
          price: '120.50',
          dt_due: '2026-09-10T15:00:00.000Z',
          dt_payment: null,
          company: {
            public_id: 'arena-a',
            name: 'Arena A',
            phone: '51988887777',
            administrator: { name: 'Maria Silva', phone: ' 51999990000 ' },
          },
        },
        {
          price: 80,
          dt_due: '2026-10-10T15:00:00.000Z',
          company: {
            public_id: 'arena-a',
            name: 'Arena A',
            administrator: { name: 'Maria Silva', phone: '51999990000' },
          },
        },
        {
          price: 90,
          dt_due: '2026-10-21T15:00:00.000Z',
          company: {
            public_id: 'hoje',
            name: 'Vence hoje',
            administrator: { name: 'Hoje', phone: '51911112222' },
          },
        },
        {
          price: 70,
          dt_due: '2026-10-01T15:00:00.000Z',
          dt_payment: '2026-10-02T15:00:00.000Z',
          company: {
            public_id: 'pago',
            name: 'Já pagou',
            administrator: { name: 'Pago', phone: '51911113333' },
          },
        },
        {
          price: 50,
          dt_due: '2026-10-05T15:00:00.000Z',
          mp_payment_id: 'pix-1',
          pix_expires_at: '2026-10-21T18:00:00.000Z',
          company: {
            public_id: 'pix',
            name: 'Aguardando PIX',
            administrator: { name: 'Pix', phone: '51911114444' },
          },
        },
        {
          price: 40,
          dt_due: '2026-10-15T15:00:00.000Z',
          company: {
            public_id: 'sem-dono',
            name: 'Quadra do Zé',
            phone: '51977776666',
            administrator: null,
          },
        },
      ],
      now,
    );

    expect(clients).toEqual([
      {
        publicId: 'arena-a',
        name: 'Arena A',
        ownerName: 'Maria Silva',
        phone: '51999990000',
        amount: 200.5,
        oldestDueDate: '2026-09-10',
        overdueCount: 2,
        daysOverdue: 41,
      },
      {
        publicId: 'sem-dono',
        name: 'Quadra do Zé',
        ownerName: null,
        phone: '51977776666',
        amount: 40,
        oldestDueDate: '2026-10-15',
        overdueCount: 1,
        daysOverdue: 6,
      },
    ]);
  });

  it('excludeViewerLogins tira quem está olhando a home', () => {
    const people = [
      {
        public_id: 'me',
        name: 'Admin',
        last_login_at: '2026-10-21T18:00:00.000Z',
        companies: [{ public_id: 'arena', name: 'Arena' }],
      },
      {
        public_id: 'client',
        name: 'Cliente',
        last_login_at: '2026-10-21T18:10:00.000Z',
        companies: [{ public_id: 'outra', name: 'Outra' }],
      },
    ];

    expect(excludeViewerLogins(people, 'me').map((person) => person.public_id)).toEqual([
      'client',
    ]);
    expect(excludeViewerLogins(people, null)).toBe(people);
  });

  it('pickLoginsSince só inclui acessos a partir do recorte', () => {
    const since = new Date('2026-08-14T11:00:00.000Z');
    expect(
      pickLoginsSince(
        [
          {
            public_id: 'old',
            name: 'Ana',
            last_login_at: '2026-08-14T10:30:00.000Z',
            companies: [{ public_id: 'a', name: 'Arena A' }],
          },
          {
            public_id: 'fresh',
            name: 'Bruno',
            last_login_at: '2026-08-14T11:20:00.000Z',
            companies: [{ public_id: 'b', name: 'Arena B' }],
          },
        ],
        since,
      ),
    ).toEqual([
      {
        publicId: 'b',
        ownerName: 'Bruno',
        arenaName: 'Arena B',
        lastLoginAt: '2026-08-14T11:20:00.000Z',
      },
    ]);
  });
});
