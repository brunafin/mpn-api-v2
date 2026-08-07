import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { Company } from 'src/companies/entities/company.entity';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Person } from 'src/people/entities/person.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { PlanEnum } from 'src/plans/enum/enum';
import { BillingService } from './billing.service';

describe('BillingService.startContract', () => {
  let service: BillingService;
  let companiesRepo: { findOne: jest.Mock };
  let paymentsRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let plansRepo: { findOne: jest.Mock };
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
    companiesRepo = { findOne: jest.fn() };
    paymentsRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (p) => ({ id: p.id ?? 55, ...p })),
      create: jest.fn((p) => p),
    };
    plansRepo = { findOne: jest.fn() };
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
        { provide: getRepositoryToken(Person), useValue: { findOne: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(Plan), useValue: plansRepo },
        { provide: MercadoPagoService, useValue: mercadoPago },
        {
          provide: PublicListingCache,
          useValue: { clear: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BillingService);
  });

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
      id: 99,
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
        plan_id: 99,
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
      id: 99,
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
