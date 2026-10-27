import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { Company } from 'src/companies/entities/company.entity';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { AccessReason } from 'src/companies/enums/access-reason.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { CronExpression } from '@nestjs/schedule';
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Person } from 'src/people/entities/person.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { PlatformSetting } from 'src/platform/entities/platform-setting.entity';
import { PlanEnum } from 'src/plans/enum/enum';
import { QueryFailedError } from 'typeorm';
import {
  BillingService,
  billingPixIdempotencyKey,
} from './billing.service';

describe('billingPixIdempotencyKey', () => {
  it('é estável sem expiry e muda depois de vencer', () => {
    expect(billingPixIdempotencyKey({ id: 7 })).toBe('billing-7');
    const expired = new Date('2026-01-01T00:00:00.000Z');
    expect(
      billingPixIdempotencyKey({ id: 7, pix_expires_at: expired }, new Date('2026-01-02')),
    ).toBe(`billing-7-x${expired.getTime()}`);
  });
});

describe('BillingService', () => {
  let service: BillingService;
  let companiesRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
  };
  let paymentsRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let plansRepo: { findOne: jest.Mock };
  let settingsRepo: { findOne: jest.Mock };
  let peopleRepo: { findOne: jest.Mock; save: jest.Mock };
  let mercadoPago: {
    isConfigured: jest.Mock;
    createPixPayment: jest.Mock;
  };

  const ownerPublicId = 'owner-uuid';
  const companyPublicId = 'company-uuid';

  const owner = {
    id: 1,
    public_id: ownerPublicId,
    email: 'dono@arena.com',
    cpf: '52998224725',
    name: 'Dono',
  };

  function paidCompany(overrides: Partial<Company> = {}): Company {
    return {
      id: 10,
      public_id: companyPublicId,
      name: 'Arena',
      partner_status: PartnerStatus.ACTIVE,
      plan_id: 99,
      is_trial: false,
      courts: [],
      administrator: owner,
      plan: {
        id: 99,
        name: 'Promocional',
        base_price: 100,
        price_per_court: 0,
      },
      ...overrides,
    } as unknown as Company;
  }

  beforeEach(async () => {
    companiesRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(async (row) => row),
    };
    paymentsRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (p) => ({ id: p.id ?? 55, ...p })),
      create: jest.fn((p) => p),
    };
    plansRepo = { findOne: jest.fn() };
    settingsRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ delinquency_block_after_days: 10 }),
    };
    peopleRepo = { findOne: jest.fn(), save: jest.fn() };
    mercadoPago = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPixPayment: jest.fn().mockResolvedValue({
        mpPaymentId: 'mp-1',
        pixCopyPaste: 'pix-code',
        pixQrBase64: 'qr',
        expiresAt: new Date(Date.now() + 3_600_000),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Company), useValue: companiesRepo },
        {
          provide: getRepositoryToken(PaymentCompany),
          useValue: paymentsRepo,
        },
        { provide: getRepositoryToken(Person), useValue: peopleRepo },
        { provide: getRepositoryToken(Plan), useValue: plansRepo },
        {
          provide: getRepositoryToken(PlatformSetting),
          useValue: settingsRepo,
        },
        { provide: MercadoPagoService, useValue: mercadoPago },
        {
          provide: PublicListingCache,
          useValue: { clear: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  describe('startContract', () => {
  it('pago com parcela aberta: gera PIX dessa parcela (fluxo Mensalidades)', async () => {
    companiesRepo.findOne.mockResolvedValue(paidCompany());
    paymentsRepo.findOne
      .mockResolvedValueOnce({
        id: 42,
        company_id: 10,
        dt_payment: null,
        price: 150,
        dt_due: new Date(),
        mp_payment_id: null,
        pix_copy_paste: null,
        pix_expires_at: null,
      })
      // generatePix re-fetch
      .mockResolvedValueOnce({
        id: 42,
        company_id: 10,
        dt_payment: null,
        price: 150,
        dt_due: new Date(),
        mp_payment_id: null,
        pix_copy_paste: null,
        pix_expires_at: null,
      });

    const result = await service.startContract(
      companyPublicId,
      ownerPublicId,
    );

    expect(result.paymentId).toBe(42);
    expect(result.pixCopyPaste).toBe('pix-code');
    expect(mercadoPago.createPixPayment).toHaveBeenCalled();
    expect(plansRepo.findOne).not.toHaveBeenCalled();
  });

  it('pago sem parcela aberta: NO_OPEN_PAYMENT', async () => {
    companiesRepo.findOne.mockResolvedValue(paidCompany());
    paymentsRepo.findOne.mockResolvedValue(null);

    await expect(
      service.startContract(companyPublicId, ownerPublicId),
    ).rejects.toBeInstanceOf(BadRequestException);

    try {
      await service.startContract(companyPublicId, ownerPublicId);
    } catch (error) {
      const body = (error as BadRequestException).getResponse() as {
        code?: string;
        message?: string;
      };
      expect(body.code).toBe('NO_OPEN_PAYMENT');
      expect(body.message).toMatch(/mensalidade em aberto/i);
    }
  });

  it('não-pago com plano residual (onboarding): ainda contrata Promocional', async () => {
    companiesRepo.findOne.mockResolvedValue(
      paidCompany({
        partner_status: PartnerStatus.ONBOARDING,
        plan_id: 99,
      }),
    );
    plansRepo.findOne.mockResolvedValue({
      id: PlanEnum.PROMOTIONAL,
      name: 'Promocional',
      base_price: 100,
      price_per_court: 0,
    });
    paymentsRepo.findOne
      .mockResolvedValueOnce(null) // open parcel for contract create
      .mockResolvedValueOnce({
        id: 55,
        company_id: 10,
        dt_payment: null,
        price: 100,
        dt_due: new Date(),
        mp_payment_id: null,
        pix_copy_paste: null,
        pix_expires_at: null,
        plan_id: PlanEnum.PROMOTIONAL,
      });

    const result = await service.startContract(
      companyPublicId,
      ownerPublicId,
    );

    expect(plansRepo.findOne).toHaveBeenCalled();
    expect(paymentsRepo.create).toHaveBeenCalled();
    expect(result.pixCopyPaste).toBe('pix-code');
  });

  it('trial FREE: contrata mesmo com plan_id FREE', async () => {
    companiesRepo.findOne.mockResolvedValue(
      paidCompany({
        plan_id: PlanEnum.FREE,
        is_trial: true,
        partner_status: PartnerStatus.ACTIVE,
      }),
    );
    plansRepo.findOne.mockResolvedValue({
      id: PlanEnum.PROMOTIONAL,
      name: 'Promocional',
      base_price: 80,
      price_per_court: 0,
    });
    paymentsRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 55,
        company_id: 10,
        dt_payment: null,
        price: 80,
        dt_due: new Date(),
        mp_payment_id: null,
        pix_copy_paste: null,
        pix_expires_at: null,
      });

    const result = await service.startContract(
      companyPublicId,
      ownerPublicId,
    );
    expect(result.pixCopyPaste).toBe('pix-code');
  });
  });

  describe('generatePix', () => {
    const openPayment = {
      id: 42,
      company_id: 10,
      dt_payment: null,
      price: 150,
      dt_due: new Date('2026-08-10T12:00:00.000Z'),
      mp_payment_id: null,
      pix_copy_paste: null,
      pix_qr_base64: null,
      pix_expires_at: null,
    };

    beforeEach(() => {
      companiesRepo.findOne.mockResolvedValue(paidCompany());
      paymentsRepo.findOne.mockImplementation(async () => ({ ...openPayment }));
    });

    it('usa chave de idempotência estável billing-{id} em retries', async () => {
      await service.generatePix(companyPublicId, ownerPublicId, 42);
      await service.generatePix(companyPublicId, ownerPublicId, 42);

      expect(mercadoPago.createPixPayment).toHaveBeenCalledTimes(2);
      const keys = mercadoPago.createPixPayment.mock.calls.map(
        (call) => call[0].idempotencyKey,
      );
      expect(keys).toEqual(['billing-42', 'billing-42']);
    });

    it('após QR expirado usa chave nova billing-{id}-x{ts}', async () => {
      const expiredAt = new Date(Date.now() - 60_000);
      paymentsRepo.findOne.mockImplementation(async () => ({
        ...openPayment,
        mp_payment_id: 'mp-old',
        pix_copy_paste: 'old-pix',
        pix_qr_base64: 'old-qr',
        pix_expires_at: expiredAt,
      }));

      await service.generatePix(companyPublicId, ownerPublicId, 42);

      expect(mercadoPago.createPixPayment).toHaveBeenCalledTimes(1);
      expect(
        mercadoPago.createPixPayment.mock.calls[0][0].idempotencyKey,
      ).toBe(`billing-42-x${expiredAt.getTime()}`);
    });

    it('rejeita CPF inválido informado no PIX', async () => {
      companiesRepo.findOne.mockResolvedValue(
        paidCompany({
          administrator: { ...owner, cpf: null } as never,
        }),
      );

      await expect(
        service.generatePix(companyPublicId, ownerPublicId, 42, {
          cpf: '00000000000',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mercadoPago.createPixPayment).not.toHaveBeenCalled();
    });

    it('não troca e-mail de login já cadastrado', async () => {
      await service.generatePix(companyPublicId, ownerPublicId, 42, {
        email: 'outro@email.com',
      });

      expect(peopleRepo.save).not.toHaveBeenCalled();
      expect(mercadoPago.createPixPayment.mock.calls[0][0].payer.email).toBe(
        'dono@arena.com',
      );
    });

    it('reusa QR válido e não chama o Mercado Pago de novo', async () => {
      paymentsRepo.findOne.mockResolvedValue({
        ...openPayment,
        mp_payment_id: 'mp-1',
        pix_copy_paste: 'pix-code',
        pix_qr_base64: 'qr',
        pix_expires_at: new Date(Date.now() + 3_600_000),
      });

      const result = await service.generatePix(
        companyPublicId,
        ownerPublicId,
        42,
      );

      expect(result.pixCopyPaste).toBe('pix-code');
      expect(mercadoPago.createPixPayment).not.toHaveBeenCalled();
    });
  });

  describe('restrictCompanyIfDelinquent', () => {
    const due = new Date('2026-10-01T15:00:00.000Z');

    it('bloqueia no 10º dia após o vencimento', async () => {
      const company = paidCompany({
        access_mode: AccessMode.FULL,
        access_reason: null,
      });
      paymentsRepo.find.mockResolvedValue([
        { id: 1, dt_payment: null, dt_due: due },
      ]);

      const blocked = await service.restrictCompanyIfDelinquent(
        company,
        new Date('2026-10-11T15:00:00.000Z'),
      );

      expect(blocked).toBe(true);
      expect(company.access_mode).toBe(AccessMode.READ_ONLY);
      expect(companiesRepo.update).toHaveBeenCalled();
    });

    it('não bloqueia no 9º dia', async () => {
      const company = paidCompany({ access_mode: AccessMode.FULL });
      paymentsRepo.find.mockResolvedValue([
        { id: 1, dt_payment: null, dt_due: due },
      ]);

      const blocked = await service.restrictCompanyIfDelinquent(
        company,
        new Date('2026-10-10T15:00:00.000Z'),
      );

      expect(blocked).toBe(false);
      expect(companiesRepo.update).not.toHaveBeenCalled();
    });

    it('com prazo de 20 dias, 14 dias de atraso ainda não bloqueia', async () => {
      const company = paidCompany({ access_mode: AccessMode.FULL });
      paymentsRepo.find.mockResolvedValue([
        { id: 1, dt_payment: null, dt_due: due },
      ]);
      settingsRepo.findOne.mockResolvedValue({
        delinquency_block_after_days: 20,
      });

      const blocked = await service.restrictCompanyIfDelinquent(
        company,
        new Date('2026-10-15T15:00:00.000Z'),
      );

      expect(blocked).toBe(false);
      expect(company.access_mode).toBe(AccessMode.FULL);
    });

    it('não altera somente leitura marcada pelo motivo admin', async () => {
      const company = paidCompany({
        access_mode: AccessMode.READ_ONLY,
        access_reason: AccessReason.ADMIN,
      });
      paymentsRepo.find.mockResolvedValue([
        { id: 1, dt_payment: null, dt_due: due },
      ]);

      const blocked = await service.restrictCompanyIfDelinquent(
        company,
        new Date('2026-10-20T15:00:00.000Z'),
      );

      expect(blocked).toBe(false);
      expect(company.access_mode).toBe(AccessMode.READ_ONLY);
      expect(company.access_reason).toBe(AccessReason.ADMIN);
      expect(companiesRepo.update).not.toHaveBeenCalled();
      expect(companiesRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('cron das 5h', () => {
    it('está no processo da API, sem fuso próprio, e aplica o bloqueio', async () => {
      const options = Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        BillingService.prototype.handleGenerateDueParcelsCron,
      );
      expect(options).toMatchObject({
        cronTime: CronExpression.EVERY_DAY_AT_5AM,
      });
      expect(options.timeZone).toBeUndefined();

      const restrict = jest
        .spyOn(service, 'restrictDelinquentCompanies')
        .mockResolvedValue(0);
      jest.spyOn(service, 'generateDueParcels').mockResolvedValue({
        eligible: 0,
        created: 0,
        skipped: 0,
      });

      await service.handleGenerateDueParcelsCron();

      expect(restrict).toHaveBeenCalledWith();
    });
  });

  describe('volta do acesso', () => {
    const due = new Date('2026-10-01T15:00:00.000Z');
    const paidAt = new Date('2026-10-11T15:00:00.000Z');

    function paidParcel() {
      return {
        id: 7,
        company_id: 10,
        dt_payment: paidAt,
        dt_due: due,
        price: 110,
      };
    }

    it('pagamento confirmado devolve quem está em somente leitura por inadimplência', async () => {
      const company = paidCompany({
        access_mode: AccessMode.READ_ONLY,
        access_reason: AccessReason.DELINQUENCY,
        access_restricted_at: paidAt,
      });
      paymentsRepo.findOne.mockResolvedValue(paidParcel());
      companiesRepo.findOne.mockResolvedValue(company);

      await service.onPaymentApproved(7);

      expect(company.access_mode).toBe(AccessMode.FULL);
      expect(company.access_reason).toBeNull();
      expect(company.access_restricted_at).toBeNull();
      expect(companiesRepo.save).toHaveBeenCalledWith(company);
    });

    it('pagamento confirmado não libera bloqueio com motivo admin', async () => {
      const company = paidCompany({
        access_mode: AccessMode.READ_ONLY,
        access_reason: AccessReason.ADMIN,
        access_restricted_at: paidAt,
      });
      paymentsRepo.findOne.mockResolvedValue(paidParcel());
      companiesRepo.findOne.mockResolvedValue(company);

      await service.onPaymentApproved(7);

      expect(company.access_mode).toBe(AccessMode.READ_ONLY);
      expect(company.access_reason).toBe(AccessReason.ADMIN);
      expect(companiesRepo.save).not.toHaveBeenCalled();
    });

    it('aumentar o prazo devolve quem ainda está dentro da janela e mantém quem já passou', async () => {
      const inside = paidCompany({
        id: 10,
        access_mode: AccessMode.READ_ONLY,
        access_reason: AccessReason.DELINQUENCY,
      });
      const past = paidCompany({
        id: 11,
        public_id: 'arena-passou',
        access_mode: AccessMode.READ_ONLY,
        access_reason: AccessReason.DELINQUENCY,
      });
      settingsRepo.findOne.mockResolvedValue({
        delinquency_block_after_days: 20,
      });
      companiesRepo.find.mockResolvedValue([inside, past]);
      paymentsRepo.find.mockImplementation(
        async (query: { where: { company_id: number } }) => {
          if (query.where.company_id === 11) {
            return [
              {
                id: 2,
                dt_payment: null,
                dt_due: new Date('2026-09-20T15:00:00.000Z'),
              },
            ];
          }
          return [{ id: 1, dt_payment: null, dt_due: due }];
        },
      );

      const result = await service.applyDelinquencyPolicy(
        new Date('2026-10-15T15:00:00.000Z'),
      );

      expect(result).toEqual({ blocked: 0, released: 1 });
      expect(inside.access_mode).toBe(AccessMode.FULL);
      expect(inside.access_reason).toBeNull();
      expect(past.access_mode).toBe(AccessMode.READ_ONLY);
      expect(companiesRepo.find).toHaveBeenCalledWith({
        where: [
          expect.objectContaining({ access_mode: AccessMode.FULL }),
          expect.objectContaining({
            access_mode: AccessMode.READ_ONLY,
            access_reason: AccessReason.DELINQUENCY,
          }),
        ],
      });
    });

    it('reduzir o prazo bloqueia quem já passou do novo dia', async () => {
      const company = paidCompany({
        access_mode: AccessMode.FULL,
        access_reason: null,
      });
      settingsRepo.findOne.mockResolvedValue({
        delinquency_block_after_days: 4,
      });
      companiesRepo.find.mockResolvedValue([company]);
      paymentsRepo.find.mockResolvedValue([
        { id: 1, dt_payment: null, dt_due: due },
      ]);

      const result = await service.applyDelinquencyPolicy(
        new Date('2026-10-06T15:00:00.000Z'),
      );

      expect(result).toEqual({ blocked: 1, released: 0 });
      expect(company.access_mode).toBe(AccessMode.READ_ONLY);
      expect(company.access_reason).toBe(AccessReason.DELINQUENCY);
    });
  });

  describe('aviso antes do bloqueio', () => {
    const due = new Date('2026-10-01T15:00:00.000Z');

    async function summaryAt(iso: string) {
      const company = paidCompany({
        access_mode: AccessMode.FULL,
        access_reason: null,
        trial_ends_at: new Date('2026-12-01T15:00:00.000Z'),
        day_due: 1,
        payments: [
          {
            id: 1,
            dt_payment: null,
            dt_due: due,
            price: 110,
          },
        ],
      } as Partial<Company>);
      companiesRepo.findOne.mockResolvedValue(company);
      paymentsRepo.find.mockResolvedValue(company.payments);

      jest.useFakeTimers({
        now: new Date(iso),
        doNotFake: [
          'nextTick',
          'queueMicrotask',
          'setImmediate',
          'setInterval',
          'setTimeout',
          'clearTimeout',
          'clearInterval',
        ],
      });
      try {
        return {
          company,
          summary: await service.getBillingSummary(
            companyPublicId,
            ownerPublicId,
          ),
        };
      } finally {
        jest.useRealTimers();
      }
    }

    it('no 9º dia ainda avisa e não suspende', async () => {
      const { company, summary } = await summaryAt('2026-10-10T15:00:00.000Z');

      expect(company.access_mode).toBe(AccessMode.FULL);
      expect(summary.delinquencyReminder).toEqual({
        paymentId: 1,
        dueDate: '2026-10-01',
        suspendsOn: '2026-10-11',
        daysAfterDue: 9,
      });
    });

    it('no 10º dia o aviso some e a arena fica somente leitura', async () => {
      const { company, summary } = await summaryAt('2026-10-11T15:00:00.000Z');

      expect(company.access_mode).toBe(AccessMode.READ_ONLY);
      expect(company.access_reason).toBe(AccessReason.DELINQUENCY);
      expect(summary.delinquencyReminder).toBeNull();
    });

    it('antes do 3º dia não há aviso', async () => {
      const { company, summary } = await summaryAt('2026-10-03T15:00:00.000Z');

      expect(company.access_mode).toBe(AccessMode.FULL);
      expect(summary.delinquencyReminder).toBeNull();
    });
  });

  describe('generateDueParcels', () => {
    const midMonth = new Date('2026-08-15T15:00:00.000Z');

    function eligibleCompany() {
      return { ...paidCompany(), day_due: 10 };
    }

    it('cria parcela quando não existe no mês', async () => {
      companiesRepo.find = jest.fn().mockResolvedValue([eligibleCompany()]);
      paymentsRepo.find.mockResolvedValue([]);

      const result = await service.generateDueParcels(midMonth);

      expect(result).toEqual({ eligible: 1, created: 1, skipped: 0 });
      expect(paymentsRepo.save).toHaveBeenCalled();
    });

    it('trata unique 23505 de corrida como skip', async () => {
      companiesRepo.find = jest.fn().mockResolvedValue([eligibleCompany()]);
      paymentsRepo.find.mockResolvedValue([]);
      paymentsRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
        ),
      );

      const result = await service.generateDueParcels(midMonth);

      expect(result).toEqual({ eligible: 1, created: 0, skipped: 1 });
    });

    it('não recria quando já existe parcela no mês', async () => {
      companiesRepo.find = jest.fn().mockResolvedValue([eligibleCompany()]);
      paymentsRepo.find.mockResolvedValue([
        { id: 1, company_id: 10, dt_due: new Date(2026, 7, 10, 12) },
      ]);

      const result = await service.generateDueParcels(midMonth);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(paymentsRepo.save).not.toHaveBeenCalled();
    });
  });
});
