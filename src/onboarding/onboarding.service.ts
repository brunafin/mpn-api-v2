import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { Court } from 'src/courts/entities/court.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { DaysOfWeek } from 'src/days-of-week/entities/days-of-week.entity';
import { Sport } from 'src/sports/entities/sport.entity';
import { TypeOfCourt } from 'src/type-of-court/entities/type-of-court.entity';
import { Person } from 'src/people/entities/person.entity';
import { CourtSchedulesService } from 'src/court-schedules/court-schedules.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { JwtService } from '@nestjs/jwt';
import { format } from 'date-fns';

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
    @InjectRepository(TypeOfCourt)
    private readonly typeOfCourtRepository: Repository<TypeOfCourt>,
    @InjectRepository(DaysOfWeek)
    private readonly daysOfWeekRepository: Repository<DaysOfWeek>,
    private readonly courtSchedulesService: CourtSchedulesService,
    private readonly jwtService: JwtService,
  ) {}

  async complete(ownerPublicId: string, dto: CreateOnboardingDto) {
    const person = await this.personRepository.findOne({
      where: { public_id: ownerPublicId },
      relations: ['companies'],
    });

    if (!person) {
      throw new NotFoundException('Dono não encontrado.');
    }
    if (!person.status) {
      throw new ForbiddenException('Confirme seu e-mail antes de continuar.');
    }
    if (person.companies?.length) {
      throw new ConflictException('Este dono já possui um estabelecimento.');
    }

    // Valida esportes.
    const sportIds = Array.from(
      new Set(dto.courts.flatMap((court) => court.sport_ids)),
    );
    const sports = await this.sportRepository.findBy({ id: In(sportIds) });
    if (sports.length !== sportIds.length) {
      throw new BadRequestException('Um ou mais esportes não foram encontrados.');
    }
    const sportsById = new Map(sports.map((s) => [s.id, s]));

    // Valida tipos de quadra.
    const typeIds = Array.from(
      new Set(dto.courts.map((court) => court.type_of_court_id)),
    );
    const types = await this.typeOfCourtRepository.findBy({ id: In(typeIds) });
    if (types.length !== typeIds.length) {
      throw new BadRequestException(
        'Um ou mais tipos de quadra não foram encontrados.',
      );
    }

    // Mapa ref (0..6) -> day_of_week_id.
    const days = await this.daysOfWeekRepository.find();
    const dayIdByRef = new Map(days.map((d) => [d.ref, d.id]));
    for (const day of dto.weekTemplate) {
      if (!dayIdByRef.has(day.day_of_week_ref)) {
        throw new BadRequestException(
          `Dia da semana inválido: ${day.day_of_week_ref}.`,
        );
      }
    }

    const createdCourts = await this.companyRepository.manager.transaction(
      async (manager) => {
        const company = await manager.getRepository(Company).save(
          manager.getRepository(Company).create({
            name: dto.companyName.trim(),
            phone: dto.companyPhone?.replace(/\D/g, '') || undefined,
            administrator_id: person.id,
            is_active: false,
          }),
        );

        const courts: Court[] = [];
        for (const courtDto of dto.courts) {
          const court = await manager.getRepository(Court).save(
            manager.getRepository(Court).create({
              name: courtDto.name.trim(),
              company_id: company.id,
              type_of_court_id: courtDto.type_of_court_id,
              floor: courtDto.floor ?? null,
              is_covered: courtDto.is_covered ?? true,
              is_can_have_net: courtDto.is_can_have_net ?? false,
              show: false,
              court_sports: courtDto.sport_ids
                .map((id) => sportsById.get(id))
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

        return { company, courts };
      },
    );

    // Popula as próximas datas para a agenda já nascer preenchida.
    // Best-effort: o cron diário também completa horários faltantes.
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + POPULATE_DAYS_AHEAD);
    const start = format(today, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');

    let schedulesPopulated = true;
    for (const court of createdCourts.courts) {
      try {
        await this.courtSchedulesService.populateCourtSchedule(
          court.id,
          start,
          end,
        );
      } catch (error) {
        schedulesPopulated = false;
        console.error(
          `[Onboarding] Falha ao popular agenda da quadra ${court.id}:`,
          error.message,
        );
      }
    }

    // Reemite o token já com o estabelecimento, para a agenda liberar sem novo login.
    const access_token = this.jwtService.sign({
      sub: person.public_id,
      username: person.username,
      companyPublicId: createdCourts.company.public_id,
      companyName: createdCourts.company.name,
      updatedPassword: true,
    });

    return {
      companyPublicId: createdCourts.company.public_id,
      companyName: createdCourts.company.name,
      courts: createdCourts.courts.map((c) => ({
        publicId: c.public_id,
        name: c.name,
      })),
      schedulesPopulated,
      access_token,
    };
  }
}
