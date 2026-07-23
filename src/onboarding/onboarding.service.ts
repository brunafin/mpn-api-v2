import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { Court } from 'src/courts/entities/court.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { DaysOfWeek } from 'src/days-of-week/entities/days-of-week.entity';
import { Sport } from 'src/sports/entities/sport.entity';
import { Person } from 'src/people/entities/person.entity';
import { CourtSchedulesService } from 'src/court-schedules/court-schedules.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { JwtService } from '@nestjs/jwt';
import { format } from 'date-fns';
import { slugify } from 'src/utils/slugify';
import { EntityManager } from 'typeorm';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';

const POPULATE_DAYS_AHEAD = 89;

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
    @InjectRepository(DaysOfWeek)
    private readonly daysOfWeekRepository: Repository<DaysOfWeek>,
    private readonly courtSchedulesService: CourtSchedulesService,
    private readonly jwtService: JwtService,
  ) {}

  async complete(ownerPublicId: string, dto: CreateOnboardingDto) {
    const person = await this.personRepository.findOne({
      where: { public_id: ownerPublicId },
    });

    if (!person) {
      throw new NotFoundException('Dono não encontrado.');
    }
    if (!person.status) {
      throw new ForbiddenException('Confirme seu e-mail antes de continuar.');
    }

    this.assertAddress(dto);
    this.assertCourts(dto);

    // Idempotente: se a 1ª tentativa criou e o client cancelou/timeout,
    // o retry devolve o estabelecimento já existente em vez de 409.
    const existingCompany = await this.companyRepository.findOne({
      where: { administrator_id: person.id },
      relations: ['courts'],
    });
    if (existingCompany) {
      return this.toResponse(
        person,
        existingCompany,
        existingCompany.courts ?? [],
        true,
      );
    }

    const dayIdByRef = await this.loadDayIdByRef(dto);
    const sportByName = await this.resolveSportsByName(dto);

    const created = await this.companyRepository.manager.transaction(
      async (manager) => {
        // Revalida dentro da TX para corrida entre dois cliques.
        const raced = await manager.getRepository(Company).findOne({
          where: { administrator_id: person.id },
          relations: ['courts'],
        });
        if (raced) {
          return {
            company: raced,
            courts: raced.courts ?? [],
            alreadyExisted: true as const,
          };
        }

        const slug = await this.allocateUniqueSlug(
          manager,
          dto.companyName.trim(),
        );

        const firstAccessAt = new Date();
        const trialEndsAt = new Date(firstAccessAt);
        trialEndsAt.setMonth(trialEndsAt.getMonth() + 3);

        const company = await manager.getRepository(Company).save(
          manager.getRepository(Company).create({
            name: dto.companyName.trim(),
            phone: dto.companyPhone?.replace(/\D/g, '') || undefined,
            cep: this.formatCep(dto.cep),
            street: dto.street.trim(),
            number: dto.number.trim(),
            neighborhood: dto.neighborhood.trim(),
            city: dto.city.trim(),
            uf: dto.uf.trim().toUpperCase(),
            slug,
            administrator_id: person.id,
            is_active: false,
            partner_status: PartnerStatus.ACTIVE,
            // Trial de 3 meses começa na conclusão do onboarding (não no cadastro).
            first_access_at: firstAccessAt,
            trial_ends_at: trialEndsAt,
            plan_id: PlanEnum.FREE,
          }),
        );

        // Primeiro uso da agenda = conclusão do onboarding (atualiza último acesso).
        await manager.getRepository(Person).update(
          { id: person.id },
          { last_login_at: firstAccessAt },
        );

        const courts: Court[] = [];
        for (const courtDto of dto.courts) {
          const court = await manager.getRepository(Court).save(
            manager.getRepository(Court).create({
              name: courtDto.name.trim(),
              company_id: company.id,
              floor: courtDto.floor,
              is_covered: courtDto.is_covered ?? true,
              is_can_have_net: courtDto.is_can_have_net ?? false,
              show: false,
              court_sports: courtDto.sports
                .map((name) => sportByName.get(name.trim().toLowerCase()))
                .filter((s): s is Sport => Boolean(s)),
            }),
          );
          courts.push(court);

          const operatingRows = dto.weekTemplate.flatMap((day) =>
            day.hours.map((hour) =>
              manager.getRepository(OperatingSchedule).create({
                court_id: court.id,
                day_of_week_id: dayIdByRef.get(day.day_of_week_ref)!,
                hour,
                price: courtDto.price,
                is_active: true,
                is_fixed: false,
              }),
            ),
          );
          if (operatingRows.length) {
            await manager.getRepository(OperatingSchedule).save(operatingRows);
          }
        }

        return { company, courts, alreadyExisted: false as const };
      },
    );

    // Agenda: best-effort em background — não segura a resposta HTTP
    // (evita timeout/cancel no mobile enquanto a company já foi commitada).
    if (!created.alreadyExisted) {
      void this.populateSchedulesBackground(created.courts);
    }

    return this.toResponse(
      person,
      created.company,
      created.courts,
      created.alreadyExisted,
    );
  }

  private async allocateUniqueSlug(
    manager: EntityManager,
    companyName: string,
  ): Promise<string> {
    const base = slugify(companyName);
    let candidate = base;
    let n = 2;
    while (
      await manager.getRepository(Company).exist({ where: { slug: candidate } })
    ) {
      const suffix = `-${n}`;
      candidate = `${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
      n += 1;
    }
    return candidate;
  }

  private assertAddress(dto: CreateOnboardingDto) {
    const cepDigits = dto.cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      throw new BadRequestException('Informe um CEP válido.');
    }
    if (dto.uf.trim().toUpperCase().length !== 2) {
      throw new BadRequestException('Informe a UF com 2 letras.');
    }
    if (
      !dto.street.trim() ||
      !dto.number.trim() ||
      !dto.neighborhood.trim() ||
      !dto.city.trim()
    ) {
      throw new BadRequestException('Informe o endereço completo.');
    }
  }

  private assertCourts(dto: CreateOnboardingDto) {
    const requestedSportNames = Array.from(
      new Set(
        dto.courts
          .flatMap((court) => court.sports.map((name) => name.trim()))
          .filter((name) => name.length > 0),
      ),
    );
    if (requestedSportNames.length === 0) {
      throw new BadRequestException('Informe ao menos um esporte por quadra.');
    }
  }

  private formatCep(cep: string): string {
    const digits = cep.replace(/\D/g, '');
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  private async loadDayIdByRef(dto: CreateOnboardingDto) {
    const days = await this.daysOfWeekRepository.find();
    const dayIdByRef = new Map(days.map((d) => [d.ref, d.id]));
    for (const day of dto.weekTemplate) {
      if (!dayIdByRef.has(day.day_of_week_ref)) {
        throw new BadRequestException(
          `Dia da semana inválido: ${day.day_of_week_ref}.`,
        );
      }
    }
    return dayIdByRef;
  }

  private async resolveSportsByName(dto: CreateOnboardingDto) {
    const requestedSportNames = Array.from(
      new Set(
        dto.courts
          .flatMap((court) => court.sports.map((name) => name.trim()))
          .filter((name) => name.length > 0),
      ),
    );

    const existingSports = await this.sportRepository.find();
    const sportByName = new Map(
      existingSports.map((s) => [s.name.toLowerCase(), s]),
    );
    const sportsToCreate = requestedSportNames.filter(
      (name) => !sportByName.has(name.toLowerCase()),
    );
    if (sportsToCreate.length > 0) {
      const created = await this.sportRepository.save(
        sportsToCreate.map((name) =>
          this.sportRepository.create({ name, needsNet: false }),
        ),
      );
      for (const sport of created) {
        sportByName.set(sport.name.toLowerCase(), sport);
      }
    }
    return sportByName;
  }

  private async populateSchedulesBackground(courts: Court[]) {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + POPULATE_DAYS_AHEAD);
    const start = format(today, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');

    for (const court of courts) {
      try {
        await this.courtSchedulesService.populateCourtSchedule(
          court.id,
          start,
          end,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[Onboarding] Falha ao popular agenda da quadra ${court.id}:`,
          message,
        );
      }
    }
  }

  private toResponse(
    person: Person,
    company: Company,
    courts: Court[],
    schedulesPopulated: boolean,
  ) {
    const access_token = this.jwtService.sign({
      sub: person.public_id,
      username: person.username,
      companyPublicId: company.public_id,
      companyName: company.name,
      updatedPassword: true,
    });

    return {
      companyPublicId: company.public_id,
      companyName: company.name,
      courts: courts.map((c) => ({
        publicId: c.public_id,
        name: c.name,
      })),
      schedulesPopulated,
      access_token,
    };
  }
}
