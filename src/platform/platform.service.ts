import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format, getDaysInMonth } from 'date-fns';
import { BillingService } from 'src/billing/billing.service';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { Company } from 'src/companies/entities/company.entity';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { AccessReason } from 'src/companies/enums/access-reason.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { buildCapabilities } from 'src/companies/utils/company-access';
import {
  endCompanyTrial,
  isCompanyOnTrial,
} from 'src/companies/utils/trial-expiry';
import { Court } from 'src/courts/entities/court.entity';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { cleanupPersonById } from 'src/people/cleanup-person';
import { Person } from 'src/people/entities/person.entity';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { Plan } from 'src/plans/entities/plan.entity';
import { PlanEnum } from 'src/plans/enum/enum';
import { computeMonthlyFee } from 'src/plans/utils/compute-monthly-fee';
import { DataSource, Repository } from 'typeorm';
import { isPgUniqueViolation } from 'src/common/db/pg-error';
import { CreatePlatformPaymentDto } from './dto/create-platform-payment.dto';
import {
  ListPlatformClientsQueryDto,
  PlatformClientsSort,
} from './dto/list-platform-clients-query.dto';
import { MarkPlatformPaymentPaidDto } from './dto/mark-platform-payment-paid.dto';
import { UpdatePlatformClientAccessDto } from './dto/update-platform-client-access.dto';
import { UpdatePlatformClientPlanDto } from './dto/update-platform-client-plan.dto';
import { UpdatePlatformCourtVisibilityDto } from './dto/update-platform-court-visibility.dto';

type PlatformClientListItem = {
  kind: 'company' | 'onboarding';
  publicId: string;
  name: string;
  slug: string | null;
  city: string | null;
  uf: string | null;
  /** Publicação no portal (tarefa do manager). */
  onPortal: boolean | null;
  /** Null em `kind: 'onboarding'` (person sem company — não é partner_status de Company). */
  partnerStatus: PartnerStatus | null;
  trialEndsAt: string | Date | null;
  firstAccessAt: string | Date | null;
  isTrial: boolean;
  accessMode: AccessMode;
  accessReason: string | null;
  accessRestrictedAt: string | Date | null;
  createdAt: Date;
  dayDue: number | null;
  monthlyFee: number;
  plan: {
    id: number | null;
    name: string;
    basePrice: number;
    pricePerCourt: number;
    /** Alias da mensalidade calculada (compat). */
    price: number;
  } | null;
  owner: {
    publicId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    username: string;
    emailVerified: boolean;
    lastLoginAt: Date | null;
  } | null;
  courtsCount: number;
  visibleCourtsCount: number;
  lastPayment: {
    date: Date | null;
    price: number;
    formOfPayment: string | null;
    paid: boolean;
  } | null;
};

type PlatformPaymentHistoryItem = {
  id: number;
  date: string;
  dueDate: string | null;
  value: number;
  formOfPayment: string | null;
  paid: boolean;
  status: 'open' | 'overdue' | 'awaiting_pix' | 'paid';
  mpPaymentId: string | null;
};

type PlatformCourtDetail = {
  publicId: string;
  name: string;
  floor: string | null;
  show: boolean;
  sports: string[];
  price: number | null;
};

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(Person)
    private readonly peopleRepository: Repository<Person>,
    @InjectRepository(PaymentCompany)
    private readonly paymentsRepository: Repository<PaymentCompany>,
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Court)
    private readonly courtsRepository: Repository<Court>,
    private readonly dataSource: DataSource,
    private readonly billingService: BillingService,
    private readonly publicListingCache: PublicListingCache,
  ) {}

  async listClients(query: ListPlatformClientsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sort = query.sort ?? PlatformClientsSort.LAST_LOGIN_AT;
    const q = query.q?.trim().toLowerCase();

    await this.expireDueTrials();

    const companies = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.administrator', 'administrator')
      .leftJoinAndSelect('company.plan', 'plan')
      .leftJoinAndSelect('company.payments', 'payments')
      .leftJoinAndSelect('company.courts', 'courts')
      .getMany();

    const onboardingPeople = await this.peopleRepository
      .createQueryBuilder('person')
      .leftJoin('person.companies', 'company')
      .where('company.id IS NULL')
      .andWhere('person.role = :role', { role: PersonRole.OWNER })
      .getMany();

    let items: PlatformClientListItem[] = [
      ...companies.map((company) => this.mapListItem(company)),
      ...onboardingPeople.map((person) => this.mapOnboardingPerson(person)),
    ];

    if (q) {
      items = items.filter((item) => {
        const haystack = [
          item.name,
          item.owner?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (typeof query.is_active === 'boolean') {
      items = items.filter((item) => item.onPortal === query.is_active);
    }

    items = this.sortItems(items, sort);

    const total = items.length;
    const pageItems = items.slice((page - 1) * limit, page * limit);

    return {
      items: pageItems,
      total,
      page,
      limit,
      sort,
    };
  }

  async getClient(publicId: string) {
    await this.expireDueTrials();

    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.plan', 'plan')
      .leftJoinAndSelect('company.payments', 'payments')
      .leftJoinAndSelect('company.administrator', 'administrator')
      .leftJoinAndSelect('company.courts', 'courts')
      .leftJoinAndSelect('courts.court_sports', 'court_sports')
      .leftJoinAndSelect('courts.operating_schedule', 'operating_schedule')
      .where('company.public_id = :uuid', { uuid: publicId })
      .orderBy('payments.dt_payment', 'DESC')
      .addOrderBy('courts.name', 'ASC')
      .getOne();

    if (company) {
      return this.mapDetail(company);
    }

    const person = await this.peopleRepository.findOne({
      where: { public_id: publicId, role: PersonRole.OWNER },
      relations: ['companies'],
    });

    if (!person || (person.companies?.length ?? 0) > 0) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return {
      ...this.mapOnboardingPerson(person),
      phone: null,
      email: person.email || null,
      logoUrl: null,
      address: {
        cep: null,
        street: null,
        number: null,
        neighborhood: null,
        city: null,
        uf: null,
      },
      instagramUrl: null,
      facebookUrl: null,
      publicLink: null,
      courts: [],
      paymentHistory: [],
      plan: null,
      owner: {
        publicId: person.public_id,
        name: person.name || null,
        email: person.email || null,
        phone: person.phone || null,
        username: person.username,
        emailVerified: Boolean(person.status),
        lastLoginAt: person.last_login_at ?? null,
        createdAt: person.created_at,
      },
    };
  }

  async createPayment(publicId: string, dto: CreatePlatformPaymentDto) {
    const company = await this.findCompanyByPublicId(publicId);
    if (!company.plan_id) {
      throw new BadRequestException('Cliente sem plano associado.');
    }
    if (isCompanyOnTrial(company) || company.plan_id === PlanEnum.FREE) {
      throw new BadRequestException(
        'Cliente em período de teste não recebe mensalidade. Encerre o trial ou use a contratação.',
      );
    }

    const dueDate = this.buildDueDate(
      dto.year,
      dto.month,
      company.day_due ?? 10,
    );

    const duplicate = await this.findPaymentForMonth(
      company.id,
      dto.year,
      dto.month,
    );
    if (duplicate) {
      throw new ConflictException(
        'Já existe parcela para este mês/ano neste cliente.',
      );
    }

    const price = Number(dto.value);
    const payment = this.paymentsRepository.create({
      company_id: company.id,
      plan_id: company.plan_id,
      dt_due: dueDate,
      price,
      form_of_payment: 'PIX',
      dt_payment: null,
    });
    try {
      const saved = await this.paymentsRepository.save(payment);
      return this.mapPaymentHistoryItem(saved, company.day_due ?? 10);
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw new ConflictException(
          'Já existe parcela para este mês/ano neste cliente.',
        );
      }
      throw error;
    }
  }

  async markPaymentPaid(
    publicId: string,
    paymentId: number,
    dto: MarkPlatformPaymentPaidDto,
  ) {
    const company = await this.findCompanyByPublicId(publicId);
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId, company_id: company.id },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    if (payment.dt_payment) {
      throw new ConflictException('Esta parcela já está marcada como paga.');
    }

    payment.dt_payment = new Date(dto.paidAt);
    if (!payment.form_of_payment) {
      payment.form_of_payment = 'PIX';
    }
    const saved = await this.paymentsRepository.save(payment);
    await this.billingService.onPaymentApproved(saved.id);
    return this.mapPaymentHistoryItem(saved, company.day_due ?? 10);
  }

  async updateClientPlan(
    publicId: string,
    dto: UpdatePlatformClientPlanDto,
  ) {
    const company = await this.findCompanyByPublicId(publicId);
    const plan = await this.plansRepository.findOne({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }

    company.plan_id = plan.id;
    company.plan = plan;

    if (dto.dayDue !== undefined) {
      company.day_due = dto.dayDue;
    }

    if (dto.trialEndsAt) {
      company.trial_ends_at = new Date(dto.trialEndsAt);
    }

    if (plan.id === PlanEnum.FREE) {
      if (dto.endTrial) {
        endCompanyTrial(company);
      } else {
        company.is_trial = true;
      }
    } else {
      // Plano comercial: sai do trial, mantém histórico da data.
      if (isCompanyOnTrial(company) || dto.endTrial) {
        endCompanyTrial(company);
      } else {
        company.is_trial = false;
      }
      if (
        company.partner_status === PartnerStatus.EXPIRED ||
        company.partner_status === PartnerStatus.INACTIVE
      ) {
        company.partner_status = PartnerStatus.ACTIVE;
      }
    }

    await this.companiesRepository.save(company);
    this.publicListingCache.clear();
    return this.getClient(publicId);
  }

  async updateClientAccess(
    publicId: string,
    dto: UpdatePlatformClientAccessDto,
  ) {
    const company = await this.findCompanyByPublicId(publicId);

    if (dto.accessMode === AccessMode.READ_ONLY) {
      company.access_mode = AccessMode.READ_ONLY;
      company.access_reason =
        dto.reason ?? AccessReason.DELINQUENCY;
      company.access_restricted_at = new Date();
    } else {
      company.access_mode = AccessMode.FULL;
      company.access_reason = null;
      company.access_restricted_at = null;
    }

    await this.companiesRepository.save(company);
    this.publicListingCache.clear();
    return this.getClient(publicId);
  }

  async setCourtVisibility(
    companyPublicId: string,
    courtPublicId: string,
    dto: UpdatePlatformCourtVisibilityDto,
  ) {
    const company = await this.findCompanyByPublicId(companyPublicId);
    const court = await this.courtsRepository.findOne({
      where: {
        public_id: courtPublicId,
        company_id: company.id,
      },
    });
    if (!court) {
      throw new NotFoundException('Quadra não encontrada.');
    }

    court.show = dto.show;
    await this.courtsRepository.save(court);

    const visibleCount = await this.courtsRepository.count({
      where: { company_id: company.id, show: true },
    });
    await this.companiesRepository.update(
      { id: company.id },
      { is_active: visibleCount > 0 },
    );
    this.publicListingCache.clear();

    return this.getClient(companyPublicId);
  }

  /**
   * Exclui o cliente por completo (person + companies + courts + agendas + reservas),
   * no mesmo espírito do script `cleanup:person`.
   *
   * `publicId` pode ser o da company (cliente ativo) ou da person (onboarding).
   */
  async deleteClient(publicId: string) {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.administrator', 'administrator')
      .where('company.public_id = :uuid', { uuid: publicId })
      .getOne();

    let person: Person | null = null;

    if (company) {
      person = company.administrator ?? null;
      if (!person) {
        throw new BadRequestException(
          'Cliente sem administrador associado; não é possível excluir.',
        );
      }
    } else {
      person = await this.peopleRepository.findOne({
        where: { public_id: publicId, role: PersonRole.OWNER },
        relations: ['companies'],
      });
      if (!person || (person.companies?.length ?? 0) > 0) {
        throw new NotFoundException('Cliente não encontrado.');
      }
    }

    if (person.role === PersonRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'Não é permitido excluir um administrador da plataforma.',
      );
    }

    const result = await cleanupPersonById(this.dataSource, person.id);
    this.publicListingCache.clear();

    return {
      ok: true as const,
      person: {
        publicId: result.person.public_id,
        name: result.person.name,
        email: result.person.email,
      },
      companies: result.companies.map((c) => ({
        publicId: c.public_id,
        name: c.name,
      })),
      deleted: result.deleted,
    };
  }

  private async expireDueTrials(): Promise<void> {
    await this.companiesRepository
      .createQueryBuilder()
      .update(Company)
      .set({
        partner_status: PartnerStatus.EXPIRED,
        plan_id: null,
        is_trial: false,
      })
      .where('is_trial = true')
      .andWhere('trial_ends_at <= NOW()')
      .andWhere('partner_status = :active', {
        active: PartnerStatus.ACTIVE,
      })
      .andWhere('(plan_id IS NULL OR plan_id = :free)', {
        free: PlanEnum.FREE,
      })
      .execute();
  }

  private async findCompanyByPublicId(publicId: string): Promise<Company> {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.plan', 'plan')
      .where('company.public_id = :uuid', { uuid: publicId })
      .getOne();

    if (!company) {
      throw new NotFoundException('Cliente não encontrado.');
    }
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

  private mapPaymentHistoryItem(
    payment: PaymentCompany,
    dayDue: number,
  ): PlatformPaymentHistoryItem {
    const today = new Date();
    const fallbackDate = format(
      new Date(today.getFullYear(), today.getMonth(), dayDue),
      'yyyy-MM-dd',
    );
    const paidAt = payment.dt_payment
      ? format(new Date(payment.dt_payment), 'yyyy-MM-dd')
      : null;
    const dueDate = payment.dt_due
      ? format(new Date(payment.dt_due), 'yyyy-MM-dd')
      : null;

    return {
      id: payment.id,
      date: paidAt ?? dueDate ?? fallbackDate,
      dueDate,
      value: Number(payment.price),
      formOfPayment: payment.form_of_payment ?? null,
      paid: !!payment.dt_payment,
      status: this.resolvePaymentStatus(payment),
      mpPaymentId: payment.mp_payment_id ?? null,
    };
  }

  private resolvePaymentStatus(
    payment: PaymentCompany,
  ): PlatformPaymentHistoryItem['status'] {
    if (payment.dt_payment) return 'paid';
    const awaiting =
      Boolean(payment.mp_payment_id) &&
      payment.pix_expires_at &&
      new Date(payment.pix_expires_at).getTime() > Date.now();
    if (awaiting) return 'awaiting_pix';
    if (payment.dt_due) {
      const due = new Date(payment.dt_due);
      const now = new Date();
      const startDue = new Date(
        due.getFullYear(),
        due.getMonth(),
        due.getDate(),
      );
      const startToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      if (startDue < startToday) return 'overdue';
    }
    return 'open';
  }

  private sortItems(
    items: PlatformClientListItem[],
    sort: PlatformClientsSort,
  ): PlatformClientListItem[] {
    const partnerRank: Record<PartnerStatus, number> = {
      [PartnerStatus.ACTIVE]: 0,
      [PartnerStatus.ONBOARDING]: 1,
      [PartnerStatus.EXPIRED]: 2,
      [PartnerStatus.INACTIVE]: 3,
    };
    const rankOf = (status: PartnerStatus | null) =>
      status == null ? 1 : partnerRank[status];

    return [...items].sort((a, b) => {
      switch (sort) {
        case PlatformClientsSort.NAME:
          return a.name.localeCompare(b.name, 'pt-BR', {
            sensitivity: 'base',
          });
        case PlatformClientsSort.CREATED_AT:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case PlatformClientsSort.STATUS: {
          const byStatus = rankOf(a.partnerStatus) - rankOf(b.partnerStatus);
          if (byStatus !== 0) return byStatus;
          return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        }
        case PlatformClientsSort.LAST_LOGIN_AT:
        default: {
          const aLogin = a.owner?.lastLoginAt
            ? new Date(a.owner.lastLoginAt).getTime()
            : null;
          const bLogin = b.owner?.lastLoginAt
            ? new Date(b.owner.lastLoginAt).getTime()
            : null;
          if (aLogin == null && bLogin == null) {
            return a.name.localeCompare(b.name, 'pt-BR', {
              sensitivity: 'base',
            });
          }
          if (aLogin == null) return 1;
          if (bLogin == null) return -1;
          return bLogin - aLogin;
        }
      }
    });
  }

  private mapOnboardingPerson(person: Person): PlatformClientListItem {
    return {
      kind: 'onboarding',
      publicId: person.public_id,
      name: person.name || 'Sem nome',
      slug: null,
      city: person.city || null,
      uf: person.uf || null,
      onPortal: null,
      // Person sem company: status vem de `kind`, não de partner_status.
      partnerStatus: null,
      trialEndsAt: null,
      firstAccessAt: null,
      isTrial: false,
      accessMode: AccessMode.FULL,
      accessReason: null,
      accessRestrictedAt: null,
      createdAt: person.created_at,
      dayDue: null,
      monthlyFee: 0,
      plan: null,
      owner: {
        publicId: person.public_id,
        name: person.name || null,
        email: person.email || null,
        phone: person.phone || null,
        username: person.username,
        emailVerified: Boolean(person.status),
        lastLoginAt: person.last_login_at ?? null,
      },
      courtsCount: 0,
      visibleCourtsCount: 0,
      lastPayment: null,
    };
  }

  private mapListItem(company: Company): PlatformClientListItem {
    const owner = company.administrator;
    const courts = company.courts ?? [];
    const payments = [...(company.payments ?? [])].sort((a, b) => {
      const da = a.dt_payment ? new Date(a.dt_payment).getTime() : 0;
      const db = b.dt_payment ? new Date(b.dt_payment).getTime() : 0;
      return db - da;
    });
    const lastPayment = payments[0] ?? null;
    const planId = company.plan_id ?? company.plan?.id ?? null;
    const partnerStatus =
      company.partner_status ?? PartnerStatus.ACTIVE;
    const expired = partnerStatus === PartnerStatus.EXPIRED;
    const isTrial = isCompanyOnTrial(company) && !expired;
    const basePrice = Number(company.plan?.base_price ?? 0);
    const pricePerCourt = Number(company.plan?.price_per_court ?? 0);
    const monthlyFee = computeMonthlyFee({
      basePrice,
      pricePerCourt,
      courtsCount: courts.length,
      isTrial,
    });
    const plan =
      expired || planId == null
        ? null
        : {
            id: planId,
            name: company.plan?.name || 'Gratuito (Teste)',
            basePrice,
            pricePerCourt,
            price: monthlyFee,
          };

    const caps = buildCapabilities(company);

    return {
      kind: 'company',
      publicId: company.public_id,
      name: company.name,
      slug: company.slug,
      city: company.city || null,
      uf: company.uf || null,
      onPortal: Boolean(company.is_active) && caps.portalEligible,
      partnerStatus,
      trialEndsAt: company.trial_ends_at,
      firstAccessAt: company.first_access_at ?? null,
      isTrial,
      accessMode: caps.accessMode,
      accessReason: caps.accessReason,
      accessRestrictedAt: company.access_restricted_at ?? null,
      createdAt: company.created_at,
      dayDue: company.day_due,
      monthlyFee: expired ? 0 : monthlyFee,
      plan,
      owner: owner
        ? {
            publicId: owner.public_id,
            name: owner.name || null,
            email: owner.email || null,
            phone: owner.phone || null,
            username: owner.username,
            emailVerified: Boolean(owner.status),
            lastLoginAt: owner.last_login_at ?? null,
          }
        : null,
      courtsCount: courts.length,
      visibleCourtsCount: courts.filter((c) => c.show).length,
      lastPayment: lastPayment
        ? {
            date: lastPayment.dt_payment,
            price: lastPayment.price,
            formOfPayment: lastPayment.form_of_payment,
            paid: !!lastPayment.dt_payment,
          }
        : null,
    };
  }

  private mapDetail(company: Company) {
    const list = this.mapListItem(company);
    const owner = company.administrator;
    const dayDue = company.day_due ?? 10;

    const courts: PlatformCourtDetail[] =
      company.courts?.map((court) => {
        const activePrices = (court.operating_schedule ?? [])
          .filter((slot) => slot.is_active)
          .map((slot) => Number(slot.price));
        const price =
          activePrices.length > 0
            ? activePrices[0]
            : court.operating_schedule?.[0]
              ? Number(court.operating_schedule[0].price)
              : null;

        return {
          publicId: court.public_id,
          name: court.name,
          floor: court.floor,
          show: Boolean(court.show),
          sports: (court.court_sports ?? []).map((sport) => sport.name),
          price,
        };
      }) ?? [];

    const paymentHistory = [...(company.payments ?? [])]
      .sort((a, b) => {
        const aDue = a.dt_due ? new Date(a.dt_due).getTime() : 0;
        const bDue = b.dt_due ? new Date(b.dt_due).getTime() : 0;
        if (aDue !== bDue) return bDue - aDue;
        return b.id - a.id;
      })
      .map((payment) => this.mapPaymentHistoryItem(payment, dayDue));

    return {
      ...list,
      phone: company.phone || null,
      email: company.email || null,
      logoUrl: company.logo_url || null,
      address: {
        cep: company.cep || null,
        street: company.street || null,
        number: company.number || null,
        neighborhood: company.neighborhood || null,
        city: company.city || null,
        uf: company.uf || null,
      },
      instagramUrl: company.instagram_url || null,
      facebookUrl: company.facebook_url || null,
      publicLink: `https://marcapranos.com.br/encontre-onde-jogar/${company.slug}`,
      owner: owner
        ? {
            ...list.owner!,
            createdAt: owner.created_at,
          }
        : null,
      courts,
      paymentHistory,
      plan: list.plan
        ? {
            ...list.plan,
            dayDue: company.day_due,
          }
        : null,
    };
  }
}
