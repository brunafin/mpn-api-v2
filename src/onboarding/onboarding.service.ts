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
import {
  canonicalSportName,
  resolveSportsByName,
} from 'src/sports/resolve-sports';
import { Person } from 'src/people/entities/person.entity';
import { CourtSchedulesService } from 'src/court-schedules/court-schedules.service';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { JwtService } from '@nestjs/jwt';
import { slugify } from 'src/utils/slugify';
import { EntityManager } from 'typeorm';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { PlanEnum } from 'src/plans/enum/enum';
import {
  addDaysToDateKey,
  dateKeyToUtcDate,
  todayDateKey,
} from 'src/utils/calendarDate';

const POPULATE_DAYS_AHEAD = 89;

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
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
    this.assertWeekTemplate(dto);

    // Idempotente: se a 1ª tentativa criou e o client cancelou/timeout,
    // o retry devolve o estabelecimento já existente em vez de 409.
    const existingCompany = await this.companyRepository.findOne({
      where: { administrator_id: person.id },
      relations: ['courts'],
    });
    if (existingCompany) {
      const courts = existingCompany.courts ?? [];
      const needsPopulate = await this.courtsNeedPopulate(courts);
      if (needsPopulate) {
        this.kickoffPopulate(courts);
      }
      return this.toResponse(person, existingCompany, courts, {
        alreadyExisted: true,
        // Agenda do dia pode ainda estar nascendo em background.
        schedulesReady: !needsPopulate,
      });
    }

    const dayIdByRef = await this.loadDayIdByRef(dto);

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
        trialEndsAt.setMonth(trialEndsAt.getMonth() + 2);

        const company = await manager.getRepository(Company).save(
          manager.getRepository(Company).create({
            name: dto.companyName.trim(),
            phone: dto.companyPhone?.replace(/\D/g, '') || undefined,
            instagram_url: dto.instagramUrl?.trim() || undefined,
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
            // Trial de 2 meses começa na conclusão do onboarding (não no cadastro).
            first_access_at: firstAccessAt,
            trial_ends_at: trialEndsAt,
            is_trial: true,
            plan_id: PlanEnum.FREE,
          }),
        );

        // Primeiro uso da agenda = conclusão do onboarding (atualiza último acesso).
        await manager.getRepository(Person).update(
          { id: person.id },
          { last_login_at: firstAccessAt },
        );

        const resolvedSports = await resolveSportsByName(
          manager.getRepository(Sport),
          dto.courts.flatMap((court) => court.sports),
        );
        const sportByName = new Map(
          resolvedSports.map((sport) => [sport.name.toLowerCase(), sport]),
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
                .map((sport) =>
                  sportByName.get(
                    canonicalSportName(sport.name).toLowerCase(),
                  ),
                )
                .filter((s): s is Sport => Boolean(s)),
            }),
          );
          courts.push(court);

          const priceBySlot = new Map<string, number>();
          for (const slot of courtDto.priceSlots ?? []) {
            if (!(Number(slot.price) > 0)) continue;
            priceBySlot.set(
              `${slot.day_of_week_ref}|${slot.hour}`,
              Number(slot.price),
            );
          }

          const operatingRows = dto.weekTemplate.flatMap((day) =>
            day.hours.map((hour) =>
              manager.getRepository(OperatingSchedule).create({
                court_id: court.id,
                day_of_week_id: dayIdByRef.get(day.day_of_week_ref)!,
                hour,
                price:
                  priceBySlot.get(`${day.day_of_week_ref}|${hour}`) ??
                  courtDto.price,
                is_active: true,
                is_fixed: false,
                is_public: true,
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

    // Não bloqueia a resposta no populate — o manager abre a agenda em poucos
    // segundos e acompanha “Configurando os horários…” enquanto o dia nasce.
    if (!created.alreadyExisted) {
      this.kickoffPopulate(created.courts);
    } else {
      const needsPopulate = await this.courtsNeedPopulate(created.courts);
      if (needsPopulate) {
        this.kickoffPopulate(created.courts);
      }
      return this.toResponse(person, created.company, created.courts, {
        alreadyExisted: true,
        schedulesReady: !needsPopulate,
      });
    }

    return this.toResponse(person, created.company, created.courts, {
      alreadyExisted: false,
      schedulesReady: false,
    });
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
          .flatMap((court) =>
            court.sports.map((sport) => sport.name.trim()),
          )
          .filter((name) => name.length > 0),
      ),
    );
    if (requestedSportNames.length === 0) {
      throw new BadRequestException('Informe ao menos um esporte por quadra.');
    }
  }

  private assertWeekTemplate(dto: CreateOnboardingDto) {
    const totalHours = dto.weekTemplate.reduce(
      (sum, day) =>
        sum + day.hours.filter((hour) => hour.trim().length > 0).length,
      0,
    );
    if (totalHours === 0) {
      throw new BadRequestException(
        'Informe ao menos um horário de funcionamento.',
      );
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

  private async courtsNeedPopulate(courts: Court[]): Promise<boolean> {
    const today = dateKeyToUtcDate(todayDateKey());
    const manager = this.companyRepository.manager;
    const osRepo = manager.getRepository(OperatingSchedule);
    const csRepo = manager.getRepository(CourtSchedule);

    for (const court of courts) {
      if (!court.id) continue;
      const osCount = await osRepo.count({ where: { court_id: court.id } });
      if (osCount === 0) continue;
      const schedCount = await csRepo.count({
        where: { court_id: court.id, date: today },
      });
      if (schedCount === 0) return true;
    }
    return false;
  }

  /** Dispara populate do dia + horizonte sem segurar o HTTP. */
  private kickoffPopulate(courts: Court[]) {
    void (async () => {
      await this.populateToday(courts);
      await this.populateSchedulesBackground(courts);
    })();
  }

  private async populateToday(courts: Court[]): Promise<boolean> {
    const today = todayDateKey();
    let allOk = true;
    for (const court of courts) {
      if (!court.id) continue;
      try {
        await this.courtSchedulesService.populateCourtSchedule(
          court.id,
          today,
          today,
        );
      } catch (error) {
        allOk = false;
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[Onboarding] Falha ao popular o dia atual da quadra ${court.id}:`,
          message,
        );
      }
    }
    return allOk;
  }

  private async populateSchedulesBackground(courts: Court[]) {
    const start = addDaysToDateKey(todayDateKey(), 1);
    const end = addDaysToDateKey(todayDateKey(), POPULATE_DAYS_AHEAD);

    for (const court of courts) {
      if (!court.id) continue;
      await this.populateCourtWithRetry(court, start, end);
    }
  }

  private async populateCourtWithRetry(
    court: Court,
    start: string,
    end: string,
    attempts = 2,
  ) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this.courtSchedulesService.populateCourtSchedule(
          court.id,
          start,
          end,
        );
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[Onboarding] Falha ao popular agenda da quadra ${court.id} (tentativa ${attempt}/${attempts}):`,
          message,
        );
      }
    }
  }

  private toResponse(
    person: Person,
    company: Company,
    courts: Court[],
    flags: { alreadyExisted: boolean; schedulesReady: boolean },
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
      alreadyExisted: flags.alreadyExisted,
      schedulesReady: flags.schedulesReady,
      /** @deprecated alias de schedulesReady — clientes antigos */
      schedulesPopulated: flags.schedulesReady,
      access_token,
    };
  }
}
