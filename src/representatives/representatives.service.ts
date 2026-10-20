import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Company } from 'src/companies/entities/company.entity';
import { isCompanyOnTrial } from 'src/companies/utils/trial-expiry';
import { Person } from 'src/people/entities/person.entity';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { PeopleService } from 'src/people/people.service';
import { computeMonthlyFee } from 'src/plans/utils/compute-monthly-fee';
import { isValidPassword, PASSWORD_HINT } from 'src/utils/passwordPolicy';
import { ILike, Repository } from 'typeorm';
import { computeCommissions, type CommissionSummary } from './commission';
import { CreateRepresentativePayoutDto } from './dto/create-representative-payout.dto';
import { CreateRepresentativeDto } from './dto/create-representative.dto';
import { UpdateRepresentativeDto } from './dto/update-representative.dto';
import { RepresentativePayout } from './entities/representative-payout.entity';
import { RepresentativeProfile } from './entities/representative-profile.entity';

export const DEFAULT_FIRST_MONTH_PERCENT = 100;
export const DEFAULT_RECURRING_PERCENT = 25;

export type RepresentativeSummary = {
  publicId: string;
  name: string;
  phone: string | null;
};

export type RepresentativeCompanyItem = {
  publicId: string;
  name: string;
  city: string | null;
  uf: string | null;
  kind: 'company';
  partnerStatus: string;
  isTrial: boolean;
  trialEndsAt: Date | null;
  courtsCount: number;
  visibleCourtsCount: number;
  monthlyFee: number;
  owner: {
    publicId: string;
    name: string | null;
    phone: string | null;
  } | null;
  lastPayment: {
    date: Date | null;
    price: number;
    paid: boolean;
  } | null;
  paymentHistory: Array<{
    id: number;
    dueDate: string | null;
    paidAt: string | null;
    value: number;
    paid: boolean;
  }>;
  commissions: CommissionSummary;
};

export type RepresentativePayoutItem = {
  year: number;
  month: number;
  amount: number;
  paidAt: string;
};

export type RepresentativeDetail = {
  publicId: string;
  name: string;
  phone: string | null;
  email: string | null;
  username: string;
  status: boolean;
  lastLoginAt: Date | null;
  firstMonthPercent: number;
  recurringPercent: number;
  companiesCount: number;
  commissionTotal: number;
  companies: RepresentativeCompanyItem[];
  payouts: RepresentativePayoutItem[];
};

export type RepresentativeListItem = Omit<
  RepresentativeDetail,
  'companies' | 'payouts'
>;

@Injectable()
export class RepresentativesService {
  constructor(
    @InjectRepository(Person)
    private readonly peopleRepository: Repository<Person>,
    @InjectRepository(RepresentativeProfile)
    private readonly profilesRepository: Repository<RepresentativeProfile>,
    @InjectRepository(RepresentativePayout)
    private readonly payoutsRepository: Repository<RepresentativePayout>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    private readonly peopleService: PeopleService,
  ) {}

  async create(dto: CreateRepresentativeDto): Promise<RepresentativeDetail> {
    await this.assertUsernameFree(dto.username);
    await this.assertEmailFree(dto.email);

    let passwordHash: string | null = null;
    if (dto.password) {
      this.assertPassword(dto.password);
      passwordHash = await this.peopleService.hashPassword(dto.password);
    }

    const person = await this.peopleService.createRepresentative({
      name: dto.name.trim(),
      username: dto.username,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
    });

    const profile = this.profilesRepository.create({
      person_id: person.id,
      first_month_percent:
        dto.firstMonthPercent ?? DEFAULT_FIRST_MONTH_PERCENT,
      recurring_percent: dto.recurringPercent ?? DEFAULT_RECURRING_PERCENT,
    });
    await this.profilesRepository.save(profile);

    return this.getByPublicId(person.public_id);
  }

  async list(): Promise<RepresentativeListItem[]> {
    const people = await this.peopleRepository.find({
      where: { role: PersonRole.REPRESENTATIVE },
      relations: { representativeProfile: true },
      order: { name: 'ASC' },
    });

    const details = await Promise.all(
      people.map((person) => this.mapPerson(person, { includeCompanies: false })),
    );
    return details;
  }

  async getByPublicId(publicId: string): Promise<RepresentativeDetail> {
    const person = await this.findRepresentative(publicId);
    return this.mapPerson(person, { includeCompanies: true });
  }

  async update(
    publicId: string,
    dto: UpdateRepresentativeDto,
  ): Promise<RepresentativeDetail> {
    const person = await this.findRepresentative(publicId);

    if (dto.username && dto.username !== person.username) {
      await this.assertUsernameFree(dto.username, person.id);
      person.username = dto.username;
    }
    if (dto.email && dto.email !== person.email?.toLowerCase()) {
      await this.assertEmailFree(dto.email);
      person.email = dto.email;
    }
    if (dto.name !== undefined) person.name = dto.name.trim();
    if (dto.phone !== undefined) person.phone = dto.phone;
    if (dto.password) {
      this.assertPassword(dto.password);
      person.password = await this.peopleService.hashPassword(dto.password);
    }
    await this.peopleRepository.save(person);

    const profile = await this.ensureProfile(person);
    if (dto.firstMonthPercent !== undefined) {
      profile.first_month_percent = dto.firstMonthPercent;
    }
    if (dto.recurringPercent !== undefined) {
      profile.recurring_percent = dto.recurringPercent;
    }
    await this.profilesRepository.save(profile);

    return this.getByPublicId(publicId);
  }

  async remove(publicId: string): Promise<{ ok: true }> {
    const person = await this.findRepresentative(publicId);
    await this.companiesRepository.update(
      { representative_id: person.id },
      { representative_id: null },
    );
    person.status = false;
    await this.peopleRepository.save(person);
    return { ok: true };
  }

  async recordPayout(
    publicId: string,
    dto: CreateRepresentativePayoutDto,
  ): Promise<RepresentativeDetail> {
    const person = await this.findRepresentative(publicId);
    const paidAt = dto.paidAt.slice(0, 10);
    const amount = Number(Number(dto.amount).toFixed(2));
    const existing = await this.payoutsRepository.findOne({
      where: { person_id: person.id, year: dto.year, month: dto.month },
    });

    if (existing) {
      existing.amount = amount;
      existing.paid_at = paidAt;
      await this.payoutsRepository.save(existing);
    } else {
      await this.payoutsRepository.save(
        this.payoutsRepository.create({
          person_id: person.id,
          year: dto.year,
          month: dto.month,
          amount,
          paid_at: paidAt,
        }),
      );
    }

    return this.getByPublicId(publicId);
  }

  async getMyCompany(
    representativePublicId: string,
    companyPublicId: string,
  ): Promise<RepresentativeCompanyItem> {
    const detail = await this.getByPublicId(representativePublicId);
    const company = detail.companies.find(
      (item) => item.publicId === companyPublicId,
    );
    if (!company) {
      throw new NotFoundException('Quadra não encontrada.');
    }
    return company;
  }

  async findActiveByPublicId(publicId: string): Promise<Person> {
    const person = await this.peopleRepository.findOne({
      where: {
        public_id: publicId,
        role: PersonRole.REPRESENTATIVE,
        status: true,
      },
      relations: { representativeProfile: true },
    });
    if (!person) {
      throw new NotFoundException('Representante não encontrado.');
    }
    return person;
  }

  private async findRepresentative(publicId: string): Promise<Person> {
    const person = await this.peopleRepository.findOne({
      where: { public_id: publicId, role: PersonRole.REPRESENTATIVE },
      relations: { representativeProfile: true },
    });
    if (!person) {
      throw new NotFoundException('Representante não encontrado.');
    }
    return person;
  }

  private async mapPerson(
    person: Person,
    opts: { includeCompanies: boolean },
  ): Promise<RepresentativeDetail> {
    const profile = await this.ensureProfile(person);
    const rates = {
      firstMonthPercent: Number(profile.first_month_percent),
      recurringPercent: Number(profile.recurring_percent),
    };

    const companies = await this.companiesRepository.find({
      where: { representative_id: person.id },
      relations: {
        administrator: true,
        plan: true,
        payments: true,
        courts: true,
      },
      order: { name: 'ASC' },
    });

    const mapped = companies.map((company) =>
      this.mapCompany(company, rates),
    );
    const commissionTotal = Number(
      mapped
        .reduce((sum, company) => sum + company.commissions.total, 0)
        .toFixed(2),
    );

    const payoutRows = opts.includeCompanies
      ? await this.payoutsRepository.find({
          where: { person_id: person.id },
          order: { year: 'DESC', month: 'DESC' },
        })
      : [];

    return {
      publicId: person.public_id,
      name: person.name,
      phone: person.phone?.trim() || null,
      email: person.email || null,
      username: person.username,
      status: person.status,
      lastLoginAt: person.last_login_at,
      firstMonthPercent: rates.firstMonthPercent,
      recurringPercent: rates.recurringPercent,
      companiesCount: mapped.length,
      commissionTotal,
      companies: opts.includeCompanies ? mapped : [],
      payouts: payoutRows.map((row) => ({
        year: row.year,
        month: row.month,
        amount: Number(row.amount),
        paidAt:
          typeof row.paid_at === 'string'
            ? row.paid_at.slice(0, 10)
            : format(new Date(row.paid_at), 'yyyy-MM-dd'),
      })),
    };
  }

  private mapCompany(
    company: Company,
    rates: { firstMonthPercent: number; recurringPercent: number },
  ): RepresentativeCompanyItem {
    const courts = company.courts ?? [];
    const payments = [...(company.payments ?? [])];
    const paidSorted = [...payments].sort((a, b) => {
      const da = a.dt_payment ? new Date(a.dt_payment).getTime() : 0;
      const db = b.dt_payment ? new Date(b.dt_payment).getTime() : 0;
      return db - da;
    });
    const lastPayment = paidSorted[0] ?? null;
    const isTrial = isCompanyOnTrial(company);
    const monthlyFee = computeMonthlyFee({
      basePrice: company.plan?.base_price,
      pricePerCourt: company.plan?.price_per_court,
      courtsCount: courts.length,
      isTrial,
    });
    const owner = company.administrator;

    const paymentHistory = [...payments]
      .sort((a, b) => {
        const da = a.dt_due ? new Date(a.dt_due).getTime() : 0;
        const db = b.dt_due ? new Date(b.dt_due).getTime() : 0;
        return db - da;
      })
      .map((payment) => ({
        id: payment.id,
        dueDate: payment.dt_due
          ? format(new Date(payment.dt_due), 'yyyy-MM-dd')
          : null,
        paidAt: payment.dt_payment
          ? format(new Date(payment.dt_payment), 'yyyy-MM-dd')
          : null,
        value: Number(payment.price),
        paid: Boolean(payment.dt_payment),
      }));

    return {
      publicId: company.public_id,
      name: company.name,
      city: company.city || null,
      uf: company.uf || null,
      kind: 'company',
      partnerStatus: company.partner_status,
      isTrial,
      trialEndsAt: company.trial_ends_at ?? null,
      courtsCount: courts.length,
      visibleCourtsCount: courts.filter((court) => court.show).length,
      monthlyFee,
      owner: owner
        ? {
            publicId: owner.public_id,
            name: owner.name || null,
            phone: owner.phone?.trim() || null,
          }
        : null,
      lastPayment: lastPayment
        ? {
            date: lastPayment.dt_payment,
            price: Number(lastPayment.price),
            paid: Boolean(lastPayment.dt_payment),
          }
        : null,
      paymentHistory,
      commissions: computeCommissions(payments, rates),
    };
  }

  private async ensureProfile(
    person: Person,
  ): Promise<RepresentativeProfile> {
    if (person.representativeProfile) return person.representativeProfile;
    const existing = await this.profilesRepository.findOne({
      where: { person_id: person.id },
    });
    if (existing) {
      person.representativeProfile = existing;
      return existing;
    }
    const created = this.profilesRepository.create({
      person_id: person.id,
      first_month_percent: DEFAULT_FIRST_MONTH_PERCENT,
      recurring_percent: DEFAULT_RECURRING_PERCENT,
    });
    const saved = await this.profilesRepository.save(created);
    person.representativeProfile = saved;
    return saved;
  }

  private async assertUsernameFree(
    username: string,
    exceptPersonId?: number,
  ): Promise<void> {
    const taken = await this.peopleService.isUsernameTaken(
      username,
      exceptPersonId,
    );
    if (taken) {
      throw new ConflictException('Este usuário já está em uso.');
    }
  }

  private async assertEmailFree(email: string): Promise<void> {
    const existing = await this.peopleRepository.findOne({
      where: { email: ILike(email) },
    });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }
  }

  private assertPassword(password: string): void {
    if (!isValidPassword(password)) {
      throw new BadRequestException(PASSWORD_HINT);
    }
  }
}
