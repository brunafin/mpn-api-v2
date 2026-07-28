import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format, getDaysInMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Company } from 'src/companies/entities/company.entity';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { AccessReason } from 'src/companies/enums/access-reason.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import {
  endCompanyTrial,
  isCompanyOnTrial,
} from 'src/companies/utils/trial-expiry';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Person } from 'src/people/entities/person.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { PlanEnum } from 'src/plans/enum/enum';
import {
  computeMonthlyFee,
  quotePlanPrices,
} from 'src/plans/utils/compute-monthly-fee';
import { ILike, IsNull, Repository } from 'typeorm';
import { isEligibleForAutoParcel } from './billing-eligibility';
import {
  BillingPaymentItem,
  BillingPaymentStatus,
  BillingPixPayload,
  BillingSummary,
} from './billing.types';
import { normalizeCpf } from 'src/utils/normalize-cpf';

const BRAZIL_TZ = 'America/Sao_Paulo';
const PROMOTIONAL_PLAN_NAME = 'Promocional';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(PaymentCompany)
    private readonly paymentsRepository: Repository<PaymentCompany>,
    @InjectRepository(Person)
    private readonly peopleRepository: Repository<Person>,
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    private readonly mercadoPago: MercadoPagoService,
    private readonly publicListingCache: PublicListingCache,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handleGenerateDueParcelsCron() {
    const result = await this.generateDueParcels();
    this.logger.log(
      `Billing cron: created=${result.created} skipped=${result.skipped} eligible=${result.eligible}`,
    );
  }

  /**
   * Cria parcela do mês corrente para empresas elegíveis quando today >= day_due.
   * Idempotente por company + mês/ano.
   */
  async generateDueParcels(now = new Date()): Promise<{
    eligible: number;
    created: number;
    skipped: number;
  }> {
    const today = toZonedTime(now, BRAZIL_TZ);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const companies = await this.companiesRepository.find({
      where: { partner_status: PartnerStatus.ACTIVE },
      relations: { plan: true, courts: true },
    });

    let eligible = 0;
    let created = 0;
    let skipped = 0;

    for (const company of companies) {
      if (!isEligibleForAutoParcel(company)) {
        skipped += 1;
        continue;
      }
      eligible += 1;

      const dayDue = company.day_due ?? 10;
      const dueDate = this.buildDueDate(year, month, dayDue);
      if (today < this.startOfLocalDay(dueDate)) {
        skipped += 1;
        continue;
      }

      const existing = await this.findPaymentForMonth(company.id, year, month);
      if (existing) {
        skipped += 1;
        continue;
      }

      if (!company.plan_id) {
        skipped += 1;
        continue;
      }

      const price = computeMonthlyFee({
        basePrice: company.plan?.base_price,
        pricePerCourt: company.plan?.price_per_court,
        courtsCount: company.courts?.length ?? 0,
        isTrial: false,
      });

      if (price <= 0) {
        skipped += 1;
        continue;
      }

      await this.paymentsRepository.save(
        this.paymentsRepository.create({
          company_id: company.id,
          plan_id: company.plan_id,
          dt_due: dueDate,
          price,
          form_of_payment: 'PIX',
          dt_payment: null,
        }),
      );
      created += 1;
    }

    return { eligible, created, skipped };
  }

  async getBillingSummary(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<BillingSummary> {
    const company = await this.findOwnedCompany(companyPublicId, ownerPublicId);
    const isTrial = isCompanyOnTrial(company);
    const quotePlan = this.needsPlanActivation(company)
      ? await this.findPromotionalPlanOptional()
      : company.plan;
    const { basePrice, pricePerCourt } = quotePlanPrices(
      quotePlan ?? company.plan,
    );
    const monthlyFee = computeMonthlyFee({
      basePrice,
      pricePerCourt,
      courtsCount: company.courts?.length ?? 0,
    });

    const hasCpf = Boolean(company.administrator?.cpf?.replace(/\D/g, ''));
    const payments = [...(company.payments ?? [])].sort((a, b) => {
      const aDue = a.dt_due ? new Date(a.dt_due).getTime() : 0;
      const bDue = b.dt_due ? new Date(b.dt_due).getTime() : 0;
      if (aDue !== bDue) return bDue - aDue;
      return b.id - a.id;
    });

    const history = payments.map((p) => this.mapPaymentItem(p, hasCpf));
    const openPayment = history.find((p) => !p.paid) ?? null;

    return {
      openPayment,
      history,
      monthlyFee,
      dayDue: company.day_due,
      isTrial,
      trialEndsAt: new Date(company.trial_ends_at).toISOString(),
      pixEnabled: this.mercadoPago.isConfigured(),
    };
  }

  /**
   * Contratação: cria (ou reusa) parcela do Promocional e gera PIX.
   * Após o pagamento, onPaymentApproved vincula o plano e libera o produto.
   */
  async startContract(
    companyPublicId: string,
    ownerPublicId: string,
    cpfFromBody?: string,
  ): Promise<BillingPixPayload> {
    if (!this.mercadoPago.isConfigured()) {
      throw new UnprocessableEntityException({
        code: 'PIX_UNAVAILABLE',
        message:
          'Pagamento PIX ainda não está disponível. Fale conosco no WhatsApp.',
      });
    }

    const company = await this.findOwnedCompany(companyPublicId, ownerPublicId);
    if (!this.needsPlanActivation(company)) {
      throw new BadRequestException(
        'Este estabelecimento já possui plano ativo. Use Mensalidades para pagar.',
      );
    }

    const promotional = await this.findPromotionalPlan();
    const { basePrice, pricePerCourt } = quotePlanPrices(promotional);
    const price = computeMonthlyFee({
      basePrice,
      pricePerCourt,
      courtsCount: company.courts?.length ?? 0,
    });
    if (price <= 0) {
      throw new UnprocessableEntityException(
        'Não foi possível calcular o valor do plano. Contate o suporte.',
      );
    }

    let payment = await this.paymentsRepository.findOne({
      where: {
        company_id: company.id,
        dt_payment: IsNull(),
      },
      order: { id: 'DESC' },
    });

    const today = toZonedTime(new Date(), BRAZIL_TZ);
    if (!payment) {
      payment = await this.paymentsRepository.save(
        this.paymentsRepository.create({
          company_id: company.id,
          plan_id: promotional.id,
          dt_due: this.buildDueDate(
            today.getFullYear(),
            today.getMonth() + 1,
            Math.min(Math.max(today.getDate(), 1), 28),
          ),
          price,
          form_of_payment: 'PIX',
          dt_payment: null,
        }),
      );
    } else {
      payment.plan_id = promotional.id;
      payment.price = price;
      await this.paymentsRepository.save(payment);
    }

    return this.generatePix(
      companyPublicId,
      ownerPublicId,
      payment.id,
      cpfFromBody,
    );
  }

  async getPaymentStatus(
    companyPublicId: string,
    ownerPublicId: string,
    paymentId: number,
  ): Promise<BillingPaymentItem> {
    const company = await this.findOwnedCompany(companyPublicId, ownerPublicId);
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId, company_id: company.id },
    });
    if (!payment) {
      throw new NotFoundException('Parcela não encontrada.');
    }

    if (!payment.dt_payment && payment.mp_payment_id) {
      await this.syncPaymentFromMercadoPago(payment);
    }

    const hasCpf = Boolean(company.administrator?.cpf?.replace(/\D/g, ''));
    return this.mapPaymentItem(payment, hasCpf);
  }

  async generatePix(
    companyPublicId: string,
    ownerPublicId: string,
    paymentId: number,
    cpfFromBody?: string,
  ): Promise<BillingPixPayload> {
    if (!this.mercadoPago.isConfigured()) {
      throw new UnprocessableEntityException({
        code: 'PIX_UNAVAILABLE',
        message:
          'Pagamento PIX ainda não está disponível. Fale conosco no WhatsApp.',
      });
    }

    const company = await this.findOwnedCompany(companyPublicId, ownerPublicId);
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId, company_id: company.id },
    });
    if (!payment) {
      throw new NotFoundException('Parcela não encontrada.');
    }
    if (payment.dt_payment) {
      throw new BadRequestException('Esta parcela já está paga.');
    }

    const owner = company.administrator;
    if (!owner?.email) {
      throw new UnprocessableEntityException(
        'Cadastre um e-mail na conta para gerar o PIX.',
      );
    }

    let cpf = normalizeCpf(owner.cpf) ?? normalizeCpf(cpfFromBody);
    if (!cpf) {
      throw new UnprocessableEntityException({
        code: 'CPF_REQUIRED',
        message: 'Informe o CPF do responsável para gerar o PIX.',
      });
    }

    if (!owner.cpf || normalizeCpf(owner.cpf) !== cpf) {
      const existingCpf = await this.peopleRepository.findOne({
        where: { cpf },
      });
      if (existingCpf && existingCpf.id !== owner.id) {
        throw new ConflictException('Já existe uma conta com este CPF.');
      }
      owner.cpf = cpf;
      await this.peopleRepository.save(owner);
    }

    const now = new Date();
    const canReuse =
      payment.mp_payment_id &&
      payment.pix_copy_paste &&
      payment.pix_expires_at &&
      new Date(payment.pix_expires_at).getTime() > now.getTime();

    if (canReuse) {
      return this.mapPixPayload(payment);
    }

    const dueLabel = payment.dt_due
      ? format(new Date(payment.dt_due), 'MM/yyyy')
      : format(now, 'MM/yyyy');
    const idempotencyKey = `billing-${payment.id}-${Date.now()}`;

    const mp = await this.mercadoPago.createPixPayment({
      amount: Number(payment.price),
      description: `Mensalidade MPN — ${company.name} — ${dueLabel}`,
      externalReference: String(payment.id),
      idempotencyKey,
      payer: {
        email: owner.email,
        firstName: owner.name || company.name,
        cpf,
      },
    });

    payment.mp_payment_id = mp.mpPaymentId;
    payment.pix_copy_paste = mp.pixCopyPaste;
    payment.pix_qr_base64 = mp.pixQrBase64;
    payment.pix_expires_at = mp.expiresAt;
    payment.form_of_payment = 'PIX';
    await this.paymentsRepository.save(payment);

    return this.mapPixPayload(payment);
  }

  async markPaidFromMercadoPago(params: {
    mpPaymentId?: string | null;
    externalReference?: string | null;
    status?: string | null;
  }): Promise<boolean> {
    const status = (params.status ?? '').toLowerCase();
    if (status && status !== 'approved') {
      return false;
    }

    let payment: PaymentCompany | null = null;
    if (params.externalReference && /^\d+$/.test(params.externalReference)) {
      payment = await this.paymentsRepository.findOne({
        where: { id: Number(params.externalReference) },
      });
    }
    if (!payment && params.mpPaymentId) {
      payment = await this.paymentsRepository.findOne({
        where: { mp_payment_id: params.mpPaymentId },
      });
    }
    if (!payment) {
      this.logger.warn(
        `Webhook MP: parcela não encontrada (ref=${params.externalReference}, id=${params.mpPaymentId})`,
      );
      return false;
    }
    if (payment.dt_payment) {
      await this.onPaymentApproved(payment.id);
      return true;
    }

    if (params.mpPaymentId && !payment.mp_payment_id) {
      payment.mp_payment_id = params.mpPaymentId;
    }
    payment.dt_payment = new Date();
    payment.form_of_payment = payment.form_of_payment || 'PIX';
    await this.paymentsRepository.save(payment);
    this.logger.log(`Parcela ${payment.id} marcada como paga via MP webhook.`);
    await this.onPaymentApproved(payment.id);
    return true;
  }

  async handleWebhookPaymentNotification(mpPaymentId: string): Promise<void> {
    const remote = await this.mercadoPago.getPaymentStatus(mpPaymentId);
    if (!remote) return;
    await this.markPaidFromMercadoPago({
      mpPaymentId: remote.id,
      externalReference: remote.externalReference,
      status: remote.status,
    });
  }

  /**
   * Efeitos após pagamento aprovado:
   * - 1ª contratação (trial/expirado/sem plano pago) → vincula Promocional + libera
   * - Demais → só desbloqueia inadimplência (read_only/delinquency)
   */
  async onPaymentApproved(paymentId: number): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment?.dt_payment) return;

    const company = await this.companiesRepository.findOne({
      where: { id: payment.company_id },
      relations: { plan: true },
    });
    if (!company) return;

    if (this.needsPlanActivation(company)) {
      await this.activatePromotionalPlan(company, payment.dt_payment);
      return;
    }

    await this.unlockDelinquencyIfNeeded(company);
  }

  private async syncPaymentFromMercadoPago(
    payment: PaymentCompany,
  ): Promise<void> {
    if (!payment.mp_payment_id) return;
    const remote = await this.mercadoPago.getPaymentStatus(
      payment.mp_payment_id,
    );
    if (!remote) return;
    if (remote.status.toLowerCase() === 'approved' && !payment.dt_payment) {
      payment.dt_payment = new Date();
      payment.form_of_payment = payment.form_of_payment || 'PIX';
      await this.paymentsRepository.save(payment);
      await this.onPaymentApproved(payment.id);
    }
  }

  /** Precisa da 1ª vinculação comercial (não é cliente pago ainda). */
  private needsPlanActivation(company: Company): boolean {
    if (isCompanyOnTrial(company)) return true;
    if (company.partner_status === PartnerStatus.EXPIRED) return true;
    if (company.partner_status === PartnerStatus.INACTIVE) return true;
    if (company.plan_id == null) return true;
    if (company.plan_id === PlanEnum.FREE) return true;
    return false;
  }

  private async activatePromotionalPlan(
    company: Company,
    paidAt: Date,
  ): Promise<void> {
    const promotional = await this.findPromotionalPlan();
    endCompanyTrial(company);
    company.is_trial = false;
    company.plan_id = promotional.id;
    company.plan = promotional;
    company.partner_status = PartnerStatus.ACTIVE;

    const localPaid = toZonedTime(paidAt, BRAZIL_TZ);
    company.day_due = Math.min(Math.max(localPaid.getDate(), 1), 28);

    company.access_mode = AccessMode.FULL;
    company.access_reason = null;
    company.access_restricted_at = null;

    await this.companiesRepository.save(company);
    this.publicListingCache.clear();
    this.logger.log(
      `Company ${company.public_id} ativada no plano Promocional (day_due=${company.day_due}).`,
    );
  }

  private async unlockDelinquencyIfNeeded(company: Company): Promise<void> {
    if (company.access_mode !== AccessMode.READ_ONLY) return;
    if (
      company.access_reason &&
      company.access_reason !== AccessReason.DELINQUENCY
    ) {
      return;
    }

    company.access_mode = AccessMode.FULL;
    company.access_reason = null;
    company.access_restricted_at = null;
    await this.companiesRepository.save(company);
    this.publicListingCache.clear();
    this.logger.log(
      `Company ${company.public_id} liberada de somente leitura (inadimplência).`,
    );
  }

  private async findPromotionalPlan(): Promise<Plan> {
    const plan = await this.plansRepository.findOne({
      where: { name: ILike(PROMOTIONAL_PLAN_NAME) },
    });
    if (!plan) {
      throw new NotFoundException(
        'Plano Promocional não encontrado. Contate o suporte.',
      );
    }
    return plan;
  }

  private async findPromotionalPlanOptional(): Promise<Plan | null> {
    return this.plansRepository.findOne({
      where: { name: ILike(PROMOTIONAL_PLAN_NAME) },
    });
  }

  private async findOwnedCompany(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { public_id: companyPublicId },
      relations: {
        administrator: true,
        plan: true,
        courts: true,
        payments: true,
      },
    });
    if (!company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    assertAdministratorOwns(company.administrator?.public_id, ownerPublicId);
    return company;
  }

  private async findPaymentForMonth(
    companyId: number,
    year: number,
    month: number,
  ): Promise<PaymentCompany | null> {
    const payments = await this.paymentsRepository.find({
      where: { company_id: companyId },
    });
    return (
      payments.find((payment) => {
        if (!payment.dt_due) return false;
        const due = new Date(payment.dt_due);
        return due.getFullYear() === year && due.getMonth() + 1 === month;
      }) ?? null
    );
  }

  private buildDueDate(year: number, month: number, dayDue: number): Date {
    const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
    const day = Math.min(Math.max(dayDue, 1), daysInMonth);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  private startOfLocalDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
    );
  }

  private mapPaymentItem(
    payment: PaymentCompany,
    hasCpfOnFile: boolean,
  ): BillingPaymentItem {
    const paid = !!payment.dt_payment;
    const dueDate = payment.dt_due
      ? format(new Date(payment.dt_due), 'yyyy-MM-dd')
      : null;
    const paidAt = payment.dt_payment
      ? format(new Date(payment.dt_payment), 'yyyy-MM-dd')
      : null;

    return {
      id: payment.id,
      dueDate,
      paidAt,
      value: Number(payment.price),
      paid,
      status: this.resolveStatus(payment),
      formOfPayment: payment.form_of_payment ?? null,
      mpPaymentId: payment.mp_payment_id ?? null,
      hasCpfOnFile,
    };
  }

  private resolveStatus(payment: PaymentCompany): BillingPaymentStatus {
    if (payment.dt_payment) return 'paid';
    const now = toZonedTime(new Date(), BRAZIL_TZ);
    const due = payment.dt_due ? new Date(payment.dt_due) : null;
    const awaiting =
      Boolean(payment.mp_payment_id) &&
      payment.pix_expires_at &&
      new Date(payment.pix_expires_at).getTime() > Date.now();
    if (awaiting) return 'awaiting_pix';
    if (due && this.startOfLocalDay(due) < this.startOfLocalDay(now)) {
      return 'overdue';
    }
    return 'open';
  }

  private mapPixPayload(payment: PaymentCompany): BillingPixPayload {
    return {
      paymentId: payment.id,
      value: Number(payment.price),
      status: this.resolveStatus(payment),
      paid: !!payment.dt_payment,
      pixCopyPaste: payment.pix_copy_paste ?? null,
      pixQrBase64: payment.pix_qr_base64 ?? null,
      pixExpiresAt: payment.pix_expires_at
        ? payment.pix_expires_at.toISOString()
        : null,
      mpPaymentId: payment.mp_payment_id ?? null,
    };
  }
}
