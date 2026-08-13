import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { Between, EntityManager, ILike, In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { UrlQueryParamCourtScheduleDto } from './dto/url-query-param-court-schedule.dto';
import { instanceToPlain } from 'class-transformer';
import { getStatusCourtSchedule } from 'src/utils/getStatusCourtSchedulet';
import {
  formatDateDateToDDMMYYYY,
  formatDateTimestampToDDMMYYYY,
} from 'src/utils/formatDate';
import { Court } from 'src/courts/entities/court.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import {
  IAvailableHours,
  ICourt,
  IDetailsCourt,
  IWhereToPlayCourtList,
} from './interfaces';
import { Company } from 'src/companies/entities/company.entity';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import {
  andWhereNotStaleTrial,
  NOT_STALE_TRIAL,
  portalCompanyWhere,
} from 'src/companies/utils/portal-eligibility';
import { addHours, format, parse } from 'date-fns';
import { isCourtScheduleInPast } from 'src/utils/isCourtScheduleInPast';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { sanitizePersonName } from 'src/utils/sanitize-person-name';
import { normalizeOptionalContactPhone } from 'src/utils/normalize-contact-phone';
import { MAX_COURT_PRICE_REAIS } from 'src/utils/court-price';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';
import {
  addDaysToDateKey,
  dateKeyToUtcDate,
  eachDateKeyInclusive,
  toDateKey,
  todayDateKey,
  weekdayRefFromDateKey,
} from 'src/utils/calendarDate';
import {
  hourInPublicListingPeriod,
  parsePublicListingPeriod,
  type PublicListingPeriod,
} from 'src/utils/public-listing-period';
import {
  DEFAULT_QUOTE_BASE_PRICE,
  DEFAULT_QUOTE_PRICE_PER_COURT,
  quotePlanPrices,
} from 'src/plans/utils/compute-monthly-fee';
import { PlanEnum } from 'src/plans/enum/enum';
import { Plan } from 'src/plans/entities/plan.entity';

export enum ReservationStatusEnum {
  FIXED = 'fixed',
  INACTIVE = 'inactive',
  RESERVED = 'reserved',
  AVAILABLE = 'available',
  UNKNOWN = 'unknown',
}

interface IReservationDetailsItemProps {
  scheduleId: string;
  status: ReservationStatusEnum;
  date: string;
  reservation: {
    publicId: string;
    createdAt: string;
    contactName: string;
    contactPhone: string | null;
    observation?: string;
    isBarbecueIncluded: boolean;
    isEvent: boolean;
    isNeedsNetting: boolean;
    sportName: string;
  } | null;
  court: string;
  sports: { id: number; name: string }[];
  time: string;
  price: number;
  weekday: string;
  companyPublicId: string;
  /** true = público; false = interno; null = sem OS (órfão). */
  isPublic: boolean | null;
}

@Injectable()
export class CourtSchedulesService {
  constructor(
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly publicListingCache: PublicListingCache,
  ) {}

  /** Normaliza date de query (string | Date) para YYYY-MM-DD. */
  private toDateKey(date?: Date | string): string {
    return toDateKey(date);
  }

  invalidatePublicListingCache(opts?: {
    companyPublicId?: string;
    dateKey?: string;
    companySlug?: string;
    allAgendaDays?: boolean;
  }): void {
    this.publicListingCache.invalidateAfterMutation(opts);
  }

  private cacheScopeFromCompany(company?: {
    public_id?: string;
    slug?: string;
  } | null): { companyPublicId?: string; companySlug?: string } {
    return {
      companyPublicId: company?.public_id,
      companySlug: company?.slug,
    };
  }

  /** Chave court|dow|HH:mm para casar CS ↔ OS. */
  private scheduleHourKey(
    courtId: number,
    dayOfWeekId: number,
    hour: string,
  ): string {
    return `${courtId}|${dayOfWeekId}|${String(hour).slice(0, 5)}`;
  }

  /**
   * Remove da listagem pública slots cujo OS é interno (is_public=false).
   * Órfãos (sem OS) continuam — quick-create pontual comercial.
   */
  private async excludeInternalOperatingHours<
    T extends {
      court_id?: number;
      court?: { id: number };
      day_of_week_id?: number;
      start_hour: string;
    },
  >(schedules: T[]): Promise<T[]> {
    if (schedules.length === 0) return schedules;

    const courtIds = [
      ...new Set(
        schedules
          .map((s) => s.court_id ?? s.court?.id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    if (courtIds.length === 0) return schedules;

    const privateOs = await this.operatingScheduleRepository.find({
      where: {
        court_id: In(courtIds),
        is_public: false,
      },
      select: {
        court_id: true,
        day_of_week_id: true,
        hour: true,
      },
    });
    if (privateOs.length === 0) return schedules;

    const privateKeys = new Set(
      privateOs.map((os) =>
        this.scheduleHourKey(os.court_id, os.day_of_week_id, os.hour),
      ),
    );

    return schedules.filter((s) => {
      const courtId = s.court_id ?? s.court?.id;
      const dayOfWeekId = s.day_of_week_id;
      if (courtId == null || dayOfWeekId == null) return true;
      return !privateKeys.has(
        this.scheduleHourKey(courtId, dayOfWeekId, s.start_hour),
      );
    });
  }

  private async assertCourtOwnedBy(
    courtId: number,
    ownerPublicId: string,
  ): Promise<Court> {
    const court = await this.courtRepository.findOne({
      where: { id: courtId },
      relations: { company: { administrator: true } },
    });
    if (!court) {
      throw new NotFoundException('Quadra não encontrada.');
    }
    assertAdministratorOwns(
      court.company?.administrator?.public_id,
      ownerPublicId,
    );
    return court;
  }

  private async assertScheduleOwnedBy(
    schedulePublicId: string,
    ownerPublicId: string,
  ): Promise<CourtSchedule> {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: schedulePublicId },
      relations: { court: { company: { administrator: true } } },
    });
    if (!courtSchedule) {
      throw new NotFoundException('Horário de quadra não encontrado');
    }
    assertAdministratorOwns(
      courtSchedule.court?.company?.administrator?.public_id,
      ownerPublicId,
    );
    return courtSchedule;
  }

  async create(
    createCourtScheduleDto: CreateCourtScheduleDto,
    ownerPublicId: string,
  ) {
    const court = await this.assertCourtOwnedBy(
      createCourtScheduleDto.court_id,
      ownerPublicId,
    );
    const courtSchedule = this.courtSchedulesRepository.create(
      createCourtScheduleDto,
    );
    const saved = await this.courtSchedulesRepository.save(courtSchedule);
    this.invalidatePublicListingCache({
      ...this.cacheScopeFromCompany(court.company),
      dateKey: this.toDateKey(createCourtScheduleDto.date),
    });
    return saved;
  }

  async populateCourtSchedule(
    court_id: number,
    start_date: string,
    end_date: string,
    ownerPublicId?: string,
    manager?: EntityManager,
  ) {
    if (ownerPublicId) {
      await this.assertCourtOwnedBy(court_id, ownerPublicId);
    }
    const run = async (tx: EntityManager) => {
        const operating_schedule = await tx
          .getRepository(OperatingSchedule)
          .find({
            where: { court_id },
            relations: {
              day_of_week: true,
              court: true,
            },
          });

        if (operating_schedule.length === 0) {
          throw new Error('Não existe horário de funcionamento para a quadra');
        }

        const startKey = toDateKey(start_date);
        const endKey = toDateKey(end_date);
        const startDate = dateKeyToUtcDate(startKey);
        const endDate = dateKeyToUtcDate(endKey);
        const newsCourtSchedule: CreateCourtScheduleDto[] = [];
        const reservationsToCreate: Partial<Reservation>[] = [];

        for (const dateKey of eachDateKeyInclusive(startKey, endKey)) {
          const weekdayRef = weekdayRefFromDateKey(dateKey);

          const operatingScheduleOfDay = operating_schedule
            .map((item) => ({
              hour: item.hour,
              price: item.price,
              weekday_ref: item.day_of_week.ref,
              weekday_id: item.day_of_week_id,
              is_fixed: item.is_fixed,
              fixed_contact_name: item.fixed_contact_name,
              fixed_contact_phone: item.fixed_contact_phone,
              sport_id: item.sport_id,
              is_active: item.is_active,
              is_public: item.is_public,
            }))
            .filter((element) => element.weekday_ref === weekdayRef);

          for (const operatingSchedule of operatingScheduleOfDay) {
            const [hours, minutes] = operatingSchedule.hour
              .split(':')
              .map(Number);
            const startHour = `${hours.toString().padStart(2, '0')}:${minutes
              .toString()
              .padStart(2, '0')}`;
            const endHour = `${((hours + 1) % 24).toString().padStart(2, '0')}:${minutes
              .toString()
              .padStart(2, '0')}`;

            const newCourtSchedule: CreateCourtScheduleDto = {
              date: dateKeyToUtcDate(dateKey),
              start_hour: startHour,
              end_hour: endHour,
              day_of_week_id: operatingSchedule.weekday_id,
              price: operatingSchedule.price,
              court_id,
              available:
                operatingSchedule.is_public !== false &&
                !operatingSchedule.is_fixed &&
                operatingSchedule.is_active,
              is_fixed: operatingSchedule.is_fixed,
              fixed_contact_name: operatingSchedule.is_fixed
                ? operatingSchedule.fixed_contact_name
                : null,
              fixed_contact_phone: operatingSchedule.is_fixed
                ? operatingSchedule.fixed_contact_phone
                : null,
              sport_id: operatingSchedule.sport_id,
            };
            newsCourtSchedule.push(newCourtSchedule);
          }
        }

        let createdSchedules;
        try {
          const existingSchedules = await tx
            .getRepository(CourtSchedule)
            .find({
              where: {
                court_id,
                date: Between(startDate, endDate),
              },
            });

          const existingKeys = new Set(
            existingSchedules.map((s) => {
              const [hour, minute] = s.start_hour.split(':');
              const startHour = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
              return `${toDateKey(s.date)}-${startHour}`;
            }),
          );

          const filteredSchedules = newsCourtSchedule.filter((s) => {
            const dateStr = toDateKey(s.date);
            const [hour, minute] = s.start_hour.split(':');
            const startHour = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
            const key = `${dateStr}-${startHour}`;
            return !existingKeys.has(key);
          });

          if (filteredSchedules.length === 0) {
            console.log(
              `[Grade] Nenhum novo horário foi adicionado para a quadra ${court_id} entre ${start_date} e ${end_date}.`,
            );
            return [];
          }

          const createdSchedulesRaw = await tx
            .getRepository(CourtSchedule)
            .save(filteredSchedules);

          createdSchedules = await tx.getRepository(CourtSchedule).find({
            where: { id: In(createdSchedulesRaw.map((s) => s.id)) },
          });

          console.log(
            `[Grade] ${createdSchedules.length} novos horários adicionados para a quadra ${court_id} entre ${start_date} e ${end_date}.`,
          );

          for (const schedule of createdSchedules) {
            if (schedule.is_fixed && schedule.fixed_contact_name) {
              if (!schedule.sport_id) {
                throw new Error(
                  'Não é possível popular uma reserva sem o vínculo do esporte.',
                );
              }
              reservationsToCreate.push({
                court_schedule: schedule,
                contact_name: schedule.fixed_contact_name,
                contact_phone: normalizeOptionalContactPhone(
                  schedule.fixed_contact_phone,
                ),
                sport_id: schedule.sport_id,
              });
            }
          }

          if (reservationsToCreate.length > 0) {
            await tx.getRepository(Reservation).save(reservationsToCreate);
            console.log(
              `[Reservas Fixas] ${reservationsToCreate.length} reservas fixas criadas para a quadra ${court_id}.`,
            );
          }
        } catch (error) {
          console.error(
            `[Erro] Erro ao popular horários da quadra ${court_id}:`,
            error.message,
          );
          throw error;
        }

        return createdSchedules;
    };

    if (manager) {
      return run(manager);
    }
    return this.courtSchedulesRepository.manager.transaction(run);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCron() {
    // Quadra oculta (show=false) e company ainda não publicada (is_active=false)
    // continuam gerando: is_active é portal, não entitlement.
    // Pula só partner expirado / sem plano / trial stale.
    const courts = await this.courtRepository.find({
      where: {
        company: {
          partner_status: PartnerStatus.ACTIVE,
          plan_id: Not(IsNull()),
          is_trial: NOT_STALE_TRIAL,
        },
      },
      relations: { company: true },
    });
    const todayKey = todayDateKey();
    const endKey = addDaysToDateKey(todayKey, 89);

    console.log(
      `Iniciando verificação de horários faltantes para ${courts.length} quadras (trial/pago ativo)`,
    );

    for (const court of courts) {
      const operatingSchedule = await this.operatingScheduleRepository.find({
        where: { court_id: court.id },
        relations: { day_of_week: true },
      });

      for (const dateKey of eachDateKeyInclusive(todayKey, endKey)) {
        const weekdayRef = weekdayRefFromDateKey(dateKey);

        const expectedSlots = operatingSchedule.filter(
          (os) => os.day_of_week.ref === weekdayRef,
        );

        if (expectedSlots.length === 0) {
          continue;
        }

        const existingSchedulesCount =
          await this.courtSchedulesRepository.count({
            where: {
              court_id: court.id,
              date: dateKeyToUtcDate(dateKey),
            },
          });

        if (existingSchedulesCount < expectedSlots.length) {
          try {
            await this.populateCourtSchedule(court.id, dateKey, dateKey);
            console.log(
              `Criados horários faltantes para quadra ${court.id} no dia ${dateKey}`,
            );
          } catch (error) {
            console.error(
              `Erro ao popular quadra ${court.id} no dia ${dateKey}:`,
              error.message,
            );
          }
        }
      }
    }
  }

  async findAll(
    {
      courtId,
      city,
      date,
      hour,
      typeOfCourtId,
    }: UrlQueryParamCourtScheduleDto,
    ownerPublicId: string,
  ) {
    await this.assertCourtOwnedBy(courtId, ownerPublicId);

    let where = {};
    if (courtId) {
      where = {
        ...where,
        court_id: courtId,
      };
    }
    if (hour) {
      where = {
        ...where,
        start_hour: ILike(`${hour}:%`),
      };
    }
    if (date) {
      where = {
        ...where,
        date,
      };
    }
    if (city) {
      where = {
        ...where,
        court: {
          company: {
            city: ILike(`%${city}%`),
          },
        },
      };
    }
    if (typeOfCourtId) {
      where = {
        ...where,
        court: { type_of_court_id: typeOfCourtId },
      };
    }

    const courtSchedule = this.courtSchedulesRepository.find({
      where,
      relations: {
        court: {
          company: true,
          type_of_court: true,
        },
        day_of_week: true,
      },
      select: {
        id: true,
        date: true,
        start_hour: true,
        end_hour: true,
        available: true,
        price: true,
        court: {
          id: true,
          name: true,
          company: {
            id: true,
            name: true,
            city: true,
            logo_url: true,
          },
          type_of_court: {
            id: true,
            name: true,
          },
        },
        day_of_week: {
          description: true,
          abbreviation: true,
          ref: true,
        },
      },
    });
    return courtSchedule;
  }

  async findOneByPublicId(publicId: string, ownerPublicId: string) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: publicId },
      relations: {
        day_of_week: true,
        court: { court_sports: true, company: { administrator: true } },
        reservation: { sport: true },
      },
      select: {
        id: true,
        public_id: true,
        date: true,
        start_hour: true,
        end_hour: true,
        available: true,
        is_fixed: true,
        court_id: true,
        day_of_week_id: true,
        reservation: {
          public_id: true,
          contact_name: true,
          contact_phone: true,
          created_at: true,
          observation: true,
          is_barbecue_included: true,
          is_event: true,
          sport: {
            name: true,
            needsNet: true,
          },
        },
        court: {
          name: true,
          court_sports: true,
          company: {
            public_id: true,
            administrator: {
              public_id: true,
            },
          },
        },
        price: true,
        day_of_week: {
          description: true,
        },
      },
    });

    if (!courtSchedule) {
      throw new NotFoundException('Horário de quadra não encontrado');
    }

    assertAdministratorOwns(
      courtSchedule.court.company.administrator?.public_id,
      ownerPublicId,
    );

    const operatingSchedule = await this.operatingScheduleRepository.findOne({
      where: {
        court_id: courtSchedule.court_id,
        day_of_week_id: courtSchedule.day_of_week_id,
        hour: courtSchedule.start_hour,
      },
      select: {
        is_public: true,
      },
    });

    const obj: IReservationDetailsItemProps = {
      scheduleId: courtSchedule.public_id,
      status: getStatusCourtSchedule(courtSchedule),
      date: formatDateDateToDDMMYYYY(String(courtSchedule.date)),
      reservation: courtSchedule.reservation
        ? {
            createdAt: formatDateTimestampToDDMMYYYY(
              courtSchedule?.reservation?.created_at,
            ),
            contactName: courtSchedule.reservation?.contact_name,
            contactPhone: courtSchedule.reservation?.contact_phone,
            observation: courtSchedule.reservation?.observation,
            isBarbecueIncluded: courtSchedule.reservation?.is_barbecue_included,
            isEvent: courtSchedule.reservation?.is_event,
            isNeedsNetting: courtSchedule.reservation?.sport?.needsNet,
            sportName: courtSchedule.reservation?.sport?.name,
            publicId: courtSchedule.reservation?.public_id,
          }
        : null,
      court: courtSchedule.court.name,
      sports: courtSchedule.court?.court_sports?.map((sport) => ({
        id: sport.id,
        name: sport.name,
      })),
      time: courtSchedule.start_hour.slice(0, 5),
      price: courtSchedule.price,
      weekday: courtSchedule.day_of_week.description,
      companyPublicId: courtSchedule.court.company.public_id,
      isPublic:
        operatingSchedule == null
          ? null
          : operatingSchedule.is_public !== false,
    };

    return instanceToPlain(obj);
  }

  async updateByPublicId(
    publicId: string,
    updateCourtScheduleDto: UpdateCourtScheduleDto,
    ownerPublicId: string,
  ) {
    await this.assertScheduleOwnedBy(publicId, ownerPublicId);
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: publicId },
    });
    if (!courtSchedule) {
      throw new NotFoundException('Horário de quadra não encontrado');
    }
    this.courtSchedulesRepository.merge(courtSchedule, updateCourtScheduleDto);
    return this.courtSchedulesRepository.save(courtSchedule);
  }

  async removeByPublicId(publicId: string, ownerPublicId: string) {
    const owned = await this.assertScheduleOwnedBy(publicId, ownerPublicId);

    const result = await this.courtSchedulesRepository.manager.transaction(
      async (manager) => {
        const schedule = await manager.getRepository(CourtSchedule).findOne({
          where: { public_id: publicId },
          relations: ['reservation'],
        });
        if (!schedule) {
          throw new NotFoundException('Horário de quadra não encontrado');
        }

        if (schedule.is_fixed) {
          throw new BadRequestException(
            'Não é possível excluir um horário fixo. Libere o fixo antes.',
          );
        }
        if (schedule.reservation?.id) {
          throw new BadRequestException(
            'Não é possível excluir um horário com reserva. Cancele a reserva antes.',
          );
        }

        const operatingSchedule = await manager
          .getRepository(OperatingSchedule)
          .findOne({
            where: {
              court_id: schedule.court_id,
              day_of_week_id: schedule.day_of_week_id,
              hour: schedule.start_hour,
            },
          });

        // Grade comercial pública: não exclui (use inativar).
        if (operatingSchedule && operatingSchedule.is_public !== false) {
          throw new BadRequestException(
            'Horários da grade comercial não podem ser excluídos. Inative o horário se precisar.',
          );
        }

        // Interno: remove OS e futuros livres para não voltar no populate/cron.
        if (operatingSchedule && operatingSchedule.is_public === false) {
          const related = await manager.getRepository(CourtSchedule).find({
            where: {
              court_id: schedule.court_id,
              day_of_week_id: schedule.day_of_week_id,
              start_hour: schedule.start_hour,
              public_id: Not(publicId),
            },
            relations: ['reservation'],
          });

          const blocked = related.find(
            (s) => s.is_fixed || Boolean(s.reservation?.id),
          );
          if (blocked) {
            throw new ConflictException(
              `Não é possível excluir: há reserva ou fixo neste horário em ${formatDateDateToDDMMYYYY(String(blocked.date))}.`,
            );
          }

          const relatedIds = related.map((s) => s.id);
          if (relatedIds.length > 0) {
            await manager
              .createQueryBuilder()
              .delete()
              .from(CourtSchedule)
              .where('id IN (:...ids)', { ids: relatedIds })
              .execute();
          }

          await manager.getRepository(OperatingSchedule).delete({
            court_id: operatingSchedule.court_id,
            day_of_week_id: operatingSchedule.day_of_week_id,
            hour: operatingSchedule.hour,
          });
        }

        await manager.getRepository(CourtSchedule).delete({ id: schedule.id });

        return { message: 'Horário excluído com sucesso' };
      },
    );

    this.invalidatePublicListingCache({
      ...this.cacheScopeFromCompany(owned.court?.company),
      allAgendaDays: true,
    });
    return result;
  }

  async updateAvailability(
    publicId: string,
    available: boolean,
    ownerPublicId: string,
  ) {
    const owned = await this.assertScheduleOwnedBy(publicId, ownerPublicId);

    const schedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: publicId },
      relations: ['reservation'],
    });
    if (!schedule) {
      throw new NotFoundException('Horário de quadra não encontrado');
    }
    if (schedule.is_fixed || schedule.reservation) {
      throw new BadRequestException(
        available
          ? 'Não é possível ativar um horário reservado ou fixo.'
          : 'Não é possível inativar um horário reservado ou fixo.',
      );
    }
    if (
      available &&
      isCourtScheduleInPast(schedule.date, schedule.start_hour)
    ) {
      throw new BadRequestException(
        'Não é possível ativar um horário que já passou.',
      );
    }

    const result = await this.courtSchedulesRepository.update(
      { public_id: publicId },
      { available },
    );
    this.invalidatePublicListingCache({
      ...this.cacheScopeFromCompany(owned.court?.company),
      dateKey: this.toDateKey(owned.date),
    });
    return result;
  }

  /**
   * Inativa ou ativa horários por public_id, sem distinguir origem
   * (avulso vs fechamento de dia).
   */
  async updateAvailabilityBatch(
    body: {
      company_public_id: string;
      date?: string;
      public_ids: string[];
      available: boolean;
    },
    ownerPublicId: string,
  ) {
    const { company_public_id, available } = body;
    const publicIds = [
      ...new Set(
        (body.public_ids ?? [])
          .map((id) => String(id ?? '').trim())
          .filter(Boolean),
      ),
    ];

    if (typeof available !== 'boolean') {
      throw new BadRequestException('Informe available (true|false).');
    }
    if (!company_public_id?.trim()) {
      throw new BadRequestException('Informe company_public_id.');
    }
    if (publicIds.length === 0) {
      throw new BadRequestException('Informe ao menos um horário (public_ids).');
    }

    let dateKey: string | undefined;
    if (body.date?.trim()) {
      dateKey = this.toDateKey(body.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw new BadRequestException('Data inválida.');
      }
    }

    const company = await this.companyRepository.findOne({
      where: { public_id: company_public_id },
      relations: { administrator: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    assertAdministratorOwns(
      company.administrator?.public_id,
      ownerPublicId,
    );

    const qb = this.courtSchedulesRepository
      .createQueryBuilder('schedule')
      .innerJoin('schedule.court', 'court')
      .leftJoinAndSelect('schedule.reservation', 'reservation')
      .where('court.company_id = :companyId', { companyId: company.id })
      .andWhere('schedule.public_id IN (:...publicIds)', { publicIds });

    if (dateKey) {
      qb.andWhere('schedule.date = :date', { date: dateKey });
    }

    const schedules = await qb.getMany();
    const foundIds = new Set(schedules.map((s) => s.public_id));
    const missing = publicIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        'Um ou mais horários não foram encontrados nesta arena.',
      );
    }

    const targetIds: number[] = [];
    let skipped = 0;
    for (const schedule of schedules) {
      if (schedule.is_fixed || schedule.reservation) {
        skipped += 1;
        continue;
      }
      if (
        available &&
        isCourtScheduleInPast(schedule.date, schedule.start_hour)
      ) {
        skipped += 1;
        continue;
      }
      if (available) {
        if (!schedule.available) targetIds.push(schedule.id);
        else skipped += 1;
      } else if (schedule.available) {
        targetIds.push(schedule.id);
      } else {
        skipped += 1;
      }
    }

    if (targetIds.length > 0) {
      await this.courtSchedulesRepository.update(
        { id: In(targetIds) },
        { available },
      );
      this.invalidatePublicListingCache({
        companyPublicId: company.public_id,
        companySlug: company.slug,
        dateKey,
        allAgendaDays: !dateKey,
      });
    }

    return {
      updated: targetIds.length,
      skipped,
      date: dateKey ?? null,
      available,
    };
  }

  /**
   * Atalho do dia: inativa todos os livres OU ativa todos os inativos
   * (sem distinção de origem). Preferir availability-batch na UI de seleção.
   */
  async updateDayAvailability(
    body: {
      company_public_id: string;
      date: string;
      available: boolean;
    },
    ownerPublicId: string,
  ) {
    const { company_public_id, date, available } = body;

    if (typeof available !== 'boolean') {
      throw new BadRequestException('Informe available (true|false).');
    }
    if (!company_public_id?.trim() || !date?.trim()) {
      throw new BadRequestException('Informe company_public_id e date.');
    }

    const dateKey = this.toDateKey(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException('Data inválida.');
    }

    const company = await this.companyRepository.findOne({
      where: { public_id: company_public_id },
      relations: { administrator: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    assertAdministratorOwns(
      company.administrator?.public_id,
      ownerPublicId,
    );

    const schedules = await this.courtSchedulesRepository
      .createQueryBuilder('schedule')
      .innerJoin('schedule.court', 'court')
      .leftJoinAndSelect('schedule.reservation', 'reservation')
      .where('court.company_id = :companyId', { companyId: company.id })
      .andWhere('schedule.date = :date', { date: dateKey })
      .getMany();

    const targetIds = schedules
      .filter((schedule) => {
        if (schedule.is_fixed || schedule.reservation) return false;
        if (available) {
          if (isCourtScheduleInPast(schedule.date, schedule.start_hour)) {
            return false;
          }
          return !schedule.available;
        }
        return schedule.available;
      })
      .map((schedule) => schedule.id);

    if (targetIds.length > 0) {
      await this.courtSchedulesRepository.update(
        { id: In(targetIds) },
        { available },
      );
      this.invalidatePublicListingCache({
        companyPublicId: company.public_id,
        companySlug: company.slug,
        dateKey,
      });
    }

    return {
      updated: targetIds.length,
      date: dateKey,
      available,
      // Legado: UI não usa mais para CTA de reabrir; mantém false.
      isDayClosed: false,
    };
  }

  async fixSchedule(
    body: { court_schedule_public_id: string },
    ownerPublicId: string,
  ) {
    const owned = await this.assertScheduleOwnedBy(
      body.court_schedule_public_id,
      ownerPublicId,
    );

    const result = await this.courtSchedulesRepository.manager.transaction(
      async (manager) => {
        const courtSchedule = await manager
          .getRepository(CourtSchedule)
          .createQueryBuilder('cs')
          .leftJoinAndSelect('cs.reservation', 'reservation')
          .innerJoinAndSelect('cs.court', 'court')
          .leftJoinAndSelect('court.company', 'company')
          .setLock('pessimistic_write', undefined, ['cs'])
          .where('cs.public_id = :publicId', {
            publicId: body.court_schedule_public_id,
          })
          .getOne();
        if (!courtSchedule) {
          throw new NotFoundException('Horário não encontrado');
        }
        if (!courtSchedule.reservation || !courtSchedule.reservation.id) {
          throw new NotFoundException('Horário não possui reserva');
        }

        const contactName = sanitizePersonName(
          courtSchedule.reservation.contact_name ?? '',
        );
        if (!contactName) {
          throw new BadRequestException('Informe o nome do cliente');
        }
        const contactPhoneOptional = normalizeOptionalContactPhone(
          courtSchedule.reservation.contact_phone,
        );

        const sportId = courtSchedule.reservation.sport_id;

        await manager.getRepository(CourtSchedule).update(
          { id: courtSchedule.id },
          {
            is_fixed: true,
            available: false,
            fixed_contact_name: contactName,
            fixed_contact_phone: contactPhoneOptional,
            sport_id: sportId,
          },
        );

        const operatingSchedule = await manager
          .getRepository(OperatingSchedule)
          .findOne({
            where: {
              court_id: courtSchedule.court_id,
              day_of_week_id: courtSchedule.day_of_week_id,
              hour: courtSchedule.start_hour,
            },
          });

        if (!operatingSchedule) {
          // Slot fora da grade: promove a OS interno (não listado no portal).
          await manager.getRepository(OperatingSchedule).save(
            manager.getRepository(OperatingSchedule).create({
              court_id: courtSchedule.court_id,
              day_of_week_id: courtSchedule.day_of_week_id,
              hour: courtSchedule.start_hour,
              price: courtSchedule.price ?? 0,
              is_active: true,
              is_fixed: true,
              is_public: false,
              fixed_contact_name: contactName,
              fixed_contact_phone: contactPhoneOptional,
              sport_id: sportId,
            }),
          );
          // Materializa semanas futuras na mesma transação — falha = rollback do fix.
          const todayKey = todayDateKey();
          const endKey = addDaysToDateKey(todayKey, 89);
          try {
            await this.populateCourtSchedule(
              courtSchedule.court_id,
              todayKey,
              endKey,
              undefined,
              manager,
            );
          } catch (error) {
            throw new BadRequestException(
              `Não foi possível gerar as próximas semanas da série: ${
                error instanceof Error ? error.message : 'erro desconhecido'
              }`,
            );
          }
        } else {
          await manager.getRepository(OperatingSchedule).update(
            {
              court_id: operatingSchedule.court_id,
              day_of_week_id: operatingSchedule.day_of_week_id,
              hour: operatingSchedule.hour,
            },
            {
              is_fixed: true,
              fixed_contact_name: contactName,
              fixed_contact_phone: contactPhoneOptional,
              sport_id: sportId,
            },
          );
        }

        const futureSchedules = await manager
          .getRepository(CourtSchedule)
          .createQueryBuilder('cs')
          .leftJoinAndSelect('cs.reservation', 'reservation')
          .setLock('pessimistic_write', undefined, ['cs'])
          .where('cs.court_id = :courtId', { courtId: courtSchedule.court_id })
          .andWhere('cs.day_of_week_id = :dow', {
            dow: courtSchedule.day_of_week_id,
          })
          .andWhere('cs.start_hour = :hour', {
            hour: courtSchedule.start_hour,
          })
          .andWhere('cs.public_id != :publicId', {
            publicId: body.court_schedule_public_id,
          })
          .andWhere('cs.date > :date', { date: courtSchedule.date })
          .orderBy('cs.id', 'ASC')
          .getMany();

        for (const schedule of futureSchedules) {
          const reservation = schedule.reservation;
          if (
            reservation &&
            (reservation.contact_name !== contactName ||
              normalizeOptionalContactPhone(reservation.contact_phone) !==
                contactPhoneOptional)
          ) {
            throw new ConflictException(
              `Não é possível fixar: já existem reservas feitas para este horário no dia ${formatDateDateToDDMMYYYY(String(schedule.date))} para ${reservation.contact_name}`,
            );
          }
        }

        const futureIds = futureSchedules.map((s) => s.id);
        if (futureIds.length > 0) {
          await manager
            .createQueryBuilder()
            .update(CourtSchedule)
            .set({
              is_fixed: true,
              available: false,
              fixed_contact_name: contactName,
              fixed_contact_phone: contactPhoneOptional,
              sport_id: sportId,
            })
            .whereInIds(futureIds)
            .execute();

          const missingReservation = futureSchedules.filter(
            (s) => !s.reservation?.id,
          );
          if (missingReservation.length > 0) {
            const reservationRepo = manager.getRepository(Reservation);
            await reservationRepo.insert(
              missingReservation.map((schedule) => ({
                court_schedule_id: schedule.id,
                contact_name: contactName,
                contact_phone: contactPhoneOptional,
                sport_id: sportId,
              })),
            );
          }
        }

        return { message: 'Horário fixado com sucesso' };
      },
    );

    this.invalidatePublicListingCache({
      ...this.cacheScopeFromCompany(owned.court?.company),
      allAgendaDays: true,
    });
    return result;
  }

  async unfixSchedule(
    body: { court_schedule_public_id: string },
    ownerPublicId: string,
  ) {
    const owned = await this.assertScheduleOwnedBy(
      body.court_schedule_public_id,
      ownerPublicId,
    );
    const result = await this.courtSchedulesRepository.manager.transaction(
      async (manager) => {
        const courtSchedule = await manager
          .getRepository(CourtSchedule)
          .findOne({
            where: { public_id: body.court_schedule_public_id },
          });
        if (!courtSchedule)
          throw new NotFoundException('CourtSchedule não encontrado');

        const operatingSchedule = await manager
          .getRepository(OperatingSchedule)
          .findOne({
            where: {
              court_id: courtSchedule.court_id,
              day_of_week_id: courtSchedule.day_of_week_id,
              hour: courtSchedule.start_hour,
            },
          });
        if (!operatingSchedule)
          throw new NotFoundException('OperatingSchedule não encontrado');

        const isInternal = operatingSchedule.is_public === false;

        if (isInternal) {
          // Remove a série inteira (passados + âncora + futuros) para não
          // deixar órfãos disponíveis no portal após apagar o OS.
          const series = await manager.getRepository(CourtSchedule).find({
            where: {
              court_id: courtSchedule.court_id,
              day_of_week_id: courtSchedule.day_of_week_id,
              start_hour: courtSchedule.start_hour,
            },
            select: ['id'],
          });
          const seriesIds = series.map((s) => s.id);

          if (seriesIds.length > 0) {
            await manager
              .createQueryBuilder()
              .delete()
              .from(Reservation)
              .where('court_schedule_id IN (:...ids)', { ids: seriesIds })
              .execute();

            await manager
              .createQueryBuilder()
              .delete()
              .from(CourtSchedule)
              .where('id IN (:...ids)', { ids: seriesIds })
              .execute();
          }

          await manager.getRepository(OperatingSchedule).delete({
            court_id: operatingSchedule.court_id,
            day_of_week_id: operatingSchedule.day_of_week_id,
            hour: operatingSchedule.hour,
          });

          return {
            message: 'Horário desafixado com sucesso',
            removed: true,
          };
        }

        await manager.getRepository(CourtSchedule).update(
          { id: courtSchedule.id },
          {
            is_fixed: false,
            fixed_contact_name: null,
            fixed_contact_phone: null,
            sport_id: null,
            available: true,
          },
        );

        await manager.getRepository(Reservation).delete({
          court_schedule_id: courtSchedule.id,
        });

        await manager.getRepository(OperatingSchedule).update(
          {
            court_id: operatingSchedule.court_id,
            day_of_week_id: operatingSchedule.day_of_week_id,
            hour: operatingSchedule.hour,
          },
          {
            is_fixed: false,
            fixed_contact_name: null,
            fixed_contact_phone: null,
            sport_id: null,
          },
        );

        const futureCourtSchedules = await manager
          .getRepository(CourtSchedule)
          .find({
            where: {
              start_hour: courtSchedule.start_hour,
              day_of_week_id: courtSchedule.day_of_week_id,
              court_id: courtSchedule.court_id,
              date: MoreThan(courtSchedule.date),
              is_fixed: true,
            },
            select: ['id'],
          });

        const futureIds = futureCourtSchedules.map((s) => s.id);
        if (futureIds.length > 0) {
          await manager
            .createQueryBuilder()
            .update(CourtSchedule)
            .set({
              is_fixed: false,
              fixed_contact_name: null,
              fixed_contact_phone: null,
              sport_id: null,
              available: true,
            })
            .whereInIds(futureIds)
            .execute();

          await manager
            .createQueryBuilder()
            .delete()
            .from(Reservation)
            .where('court_schedule_id IN (:...ids)', { ids: futureIds })
            .execute();
        }

        // Passados: só tira o carimbo de fixo (mantém reserva/available).
        // Evita série “fantasma” is_fixed sem OS.is_fixed após liberar no meio.
        await manager
          .createQueryBuilder()
          .update(CourtSchedule)
          .set({
            is_fixed: false,
            fixed_contact_name: null,
            fixed_contact_phone: null,
            sport_id: null,
          })
          .where('court_id = :courtId', { courtId: courtSchedule.court_id })
          .andWhere('day_of_week_id = :dow', {
            dow: courtSchedule.day_of_week_id,
          })
          .andWhere('start_hour = :hour', { hour: courtSchedule.start_hour })
          .andWhere('date < :date', { date: courtSchedule.date })
          .andWhere('is_fixed = true')
          .execute();

        return {
          message: 'Horário desafixado com sucesso',
          removed: false,
        };
      },
    );
    this.invalidatePublicListingCache({
      ...this.cacheScopeFromCompany(owned.court?.company),
      allAgendaDays: true,
    });
    return result;
  }

  // Marca Pra Nós público
  async findWhereToPlay({
    city,
    uf,
    date,
    sport,
    period,
  }: {
    city?: string;
    uf?: string;
    date?: Date;
    sport?: string;
    period?: string;
  }) {
    const ufNorm = uf?.trim().toUpperCase() || '';
    const cityNorm = city?.trim() || '';
    const dateKey = this.toDateKey(date);
    const sportId = this.parseSportId(sport);
    const periodNorm = parsePublicListingPeriod(period);
    const cacheKey = `wtp:${dateKey}:${ufNorm}:${cityNorm.toLowerCase()}:s${sportId ?? ''}:p${periodNorm ?? ''}`;

    return this.publicListingCache.getOrSet(cacheKey, () =>
      this.loadWhereToPlay({
        cityNorm,
        ufNorm,
        date,
        sportId,
        period: periodNorm,
      }),
    );
  }

  private parseSportId(sport?: string): number | null {
    const raw = sport?.trim();
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private async loadWhereToPlay({
    cityNorm,
    ufNorm,
    date,
    sportId,
    period,
  }: {
    cityNorm: string;
    ufNorm: string;
    date?: Date;
    sportId: number | null;
    period?: PublicListingPeriod;
  }) {
    const courtSchedule = await this.courtSchedulesRepository.find({
      where: {
        available: true,
        date,
        court: {
          show: true,
          company: portalCompanyWhere({
            ...(ufNorm ? { uf: ILike(ufNorm) } : {}),
            ...(cityNorm ? { city: ILike(cityNorm) } : {}),
          }),
        },
      },
      relations: {
        court: {
          company: true,
          court_sports: true,
        },
        day_of_week: true,
      },
      select: {
        date: true,
        start_hour: true,
        price: true,
        court_id: true,
        day_of_week_id: true,
        court: {
          id: true,
          name: true,
          company: {
            id: true,
            logo_url: true,
            instagram_url: true,
            name: true,
            phone: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            uf: true,
            slug: true,
            public_id: true,
          },
          court_sports: {
            id: true,
            name: true,
          },
        },
        day_of_week: {
          description: true,
        },
      },
      order: {
        court: {
          company_id: 'ASC',
        },
        start_hour: 'ASC',
      },
    });

    const publicSchedules = await this.excludeInternalOperatingHours(
      courtSchedule,
    );

    // Público: não listar horários cujo início já passou; esporte/período.
    const openSchedules = publicSchedules.filter((item) => {
      if (isCourtScheduleInPast(item.date, item.start_hour)) return false;
      if (
        sportId != null &&
        !(item.court.court_sports ?? []).some((s) => s.id === sportId)
      ) {
        return false;
      }
      if (!hourInPublicListingPeriod(item.start_hour, period)) return false;
      return true;
    });

    const groupedByCompany = openSchedules.reduce(
      (acc, item) => {
        const companyId = item.court.company.id; // ou public_id
        const companyKey = `${item.court.company.name}-${item.court.company.phone}`;

        if (!acc[companyKey]) {
          acc[companyKey] = {
            companyId,
            logoUrl: item.court.company.logo_url,
            name: item.court.company.name,
            phone: item.court.company.phone,
            slug: item.court.company.slug,
            instagramUrl: item.court.company.instagram_url ?? '',
            city: item.court.company.city,
            uf: item.court.company.uf,
            address: `${item.court.company.street}, ${item.court.company.number} - ${item.court.company.neighborhood}, ${item.court.company.city} - ${item.court.company.uf}`,
            courts: [],
          };
        }

        let courtGroup = acc[companyKey].courts.find(
          (court) => court.courtName === item.court.name,
        );

        if (!courtGroup) {
          courtGroup = {
            courtName: item.court.name,
            courtSports: item.court.court_sports.map((sport) => ({
              label: sport.name,
              value: String(sport.id),
            })),
            schedules: [],
          };
          acc[companyKey].courts.push(courtGroup);
        }

        const schedule: IAvailableHours = {
          date: item.date,
          startHour: item.start_hour.slice(0, 5),
          price: item.price,
          courtName: item.court.name,
          courtSports: item.court.court_sports.map((sport) => ({
            label: sport.name,
            value: String(sport.id),
          })),
          dayOfWeekAbb: `(${item.day_of_week.description.slice(0, 3).toLowerCase()})`,
        };

        courtGroup.schedules.push(schedule);

        return acc;
      },
      {} as Record<
        string,
        IWhereToPlayCourtList & { companyId: number }
      >,
    );

    const result: (IWhereToPlayCourtList & { companyId: number })[] =
      Object.values(groupedByCompany);
    const withHoursCompanyIds = new Set(result.map((r) => r.companyId));

    const courtsWithoutHours = await this.loadCourtsWithoutHours({
      cityNorm,
      ufNorm,
      sportId,
      excludeCompanyIds: withHoursCompanyIds,
    });

    const courtsWithHours: IWhereToPlayCourtList[] = result.map(
      ({ companyId: _id, ...arena }) => arena,
    );

    return {
      courtsWithHours,
      courtsWithoutHours,
    };
  }

  private async loadCourtsWithoutHours({
    cityNorm,
    ufNorm,
    sportId,
    excludeCompanyIds,
  }: {
    cityNorm: string;
    ufNorm: string;
    sportId: number | null;
    excludeCompanyIds: Set<number>;
  }): Promise<IWhereToPlayCourtList[]> {
    const companies = await this.companyRepository.find({
      where: portalCompanyWhere({
        ...(ufNorm ? { uf: ILike(ufNorm) } : {}),
        ...(cityNorm ? { city: ILike(cityNorm) } : {}),
      }),
      relations: {
        courts: {
          court_sports: true,
        },
      },
      select: {
        id: true,
        logo_url: true,
        name: true,
        phone: true,
        street: true,
        number: true,
        neighborhood: true,
        city: true,
        uf: true,
        slug: true,
        instagram_url: true,
        courts: {
          id: true,
          name: true,
          show: true,
          court_sports: {
            id: true,
            name: true,
          },
        },
      },
      order: { name: 'ASC' },
    });

    const out: IWhereToPlayCourtList[] = [];
    for (const company of companies) {
      if (excludeCompanyIds.has(company.id)) continue;
      const visibleCourts = (company.courts ?? []).filter((court) => court.show);
      if (visibleCourts.length === 0) continue;

      const courtsMatchingSport =
        sportId == null
          ? visibleCourts
          : visibleCourts.filter((court) =>
              (court.court_sports ?? []).some((s) => s.id === sportId),
            );
      if (courtsMatchingSport.length === 0) continue;

      out.push({
        logoUrl: company.logo_url,
        name: company.name,
        phone: company.phone,
        slug: company.slug,
        instagramUrl: company.instagram_url ?? '',
        city: company.city,
        uf: company.uf,
        address: `${company.street}, ${company.number} - ${company.neighborhood}, ${company.city} - ${company.uf}`,
        courts: courtsMatchingSport.map((court) => ({
          courtName: court.name,
          courtSports: (court.court_sports ?? []).map((sport) => ({
            label: sport.name,
            value: String(sport.id),
          })),
          schedules: [],
        })),
      });
    }
    return out;
  }

  /** Cotação pública do plano comercial (landing). */
  async findPlatformPlanQuote() {
    const plan = await this.planRepository.findOne({
      where: { id: PlanEnum.PROMOTIONAL },
    });
    const prices = quotePlanPrices(plan);
    return {
      basePrice: prices.basePrice || DEFAULT_QUOTE_BASE_PRICE,
      pricePerCourt: prices.pricePerCourt || DEFAULT_QUOTE_PRICE_PER_COURT,
      planName: plan?.name ?? 'Promocional',
      currency: 'BRL' as const,
    };
  }

  async findStatesToPlay() {
    const companies = await this.companyRepository.find({
      where: portalCompanyWhere(),
      select: ['uf'],
      order: { uf: 'ASC' },
    });

    const unique = Array.from(
      new Set(
        companies
          .map((item) => item.uf?.trim().toUpperCase())
          .filter((uf): uf is string => Boolean(uf)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return unique.map((uf) => ({
      label: uf,
      value: uf,
    }));
  }

  async findCitiesToPlay(uf?: string) {
    const ufNorm = uf?.trim().toUpperCase() || '';
    const companies = await this.companyRepository.find({
      where: portalCompanyWhere({
        ...(ufNorm ? { uf: ILike(ufNorm) } : {}),
      }),
      select: ['city', 'uf'],
      order: { city: 'ASC' },
    });

    const uniqueCities = Array.from(
      new Set(
        companies
          .map((item) => item.city?.trim())
          .filter((city): city is string => Boolean(city)),
      ),
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return uniqueCities.map((city) => ({
      label: city,
      value: city,
    }));
  }

  async findSportsToPlay() {
    // QueryBuilder: o find()+select só em relation não carrega id das
    // quadras e acaba omitindo esportes de parte das courts.
    const qb = this.courtRepository
      .createQueryBuilder('court')
      .innerJoin('court.company', 'company')
      .innerJoin('court.court_sports', 'sport')
      .where('court.show = :show', { show: true })
      .andWhere('company.is_active = :active', { active: true })
      .andWhere('company.partner_status = :partnerStatus', {
        partnerStatus: PartnerStatus.ACTIVE,
      })
      .andWhere('company.plan_id IS NOT NULL')
      .andWhere('company.access_mode = :accessMode', {
        accessMode: AccessMode.FULL,
      });
    const rows = await andWhereNotStaleTrial(qb)
      .select('sport.id', 'id')
      .addSelect('sport.name', 'name')
      .distinct(true)
      .orderBy('sport.name', 'ASC')
      .getRawMany<{ id: number; name: string }>();

    return rows.map((row) => ({
      label: row.name,
      value: Number(row.id),
    }));
  }

  async findDetailsCourt({
    slug,
    date,
  }: {
    slug?: string;
    date: Date;
  }): Promise<IDetailsCourt> {
    const dateStr = this.toDateKey(date);
    const cacheKey = `details:${slug || ''}:${dateStr}`;

    return this.publicListingCache.getOrSet(cacheKey, () =>
      this.loadDetailsCourt(slug, dateStr),
    );
  }

  private async loadDetailsCourt(
    slug: string | undefined,
    dateStr: string,
  ): Promise<IDetailsCourt> {
    // Join com filtro de date: evita carregar ~90 dias de court_schedule
    const companyQb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.courts', 'court')
      .leftJoinAndSelect('court.court_sports', 'court_sports')
      .leftJoinAndSelect(
        'court.court_schedule',
        'schedule',
        'schedule.date = :date',
        { date: dateStr },
      )
      .leftJoinAndSelect('schedule.day_of_week', 'day_of_week')
      .leftJoinAndSelect('company.images', 'images')
      .where('company.slug = :slug', { slug })
      .andWhere('company.is_active = :active', { active: true })
      .andWhere('company.partner_status = :partnerStatus', {
        partnerStatus: PartnerStatus.ACTIVE,
      })
      .andWhere('company.plan_id IS NOT NULL')
      .andWhere('company.access_mode = :accessMode', {
        accessMode: AccessMode.FULL,
      });
    const company = await andWhereNotStaleTrial(companyQb).getOne();

    if (!company) {
      throw new NotFoundException('Quadra não encontrada');
    }

    const visibleCourts = (company.courts ?? []).filter((court) => court.show);

    const photoUrls = (company.images ?? [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .slice(0, 3)
      .map((image) => image.url)
      .filter(Boolean);

    const photoHighlightUrl =
      photoUrls[0] ?? company.photo_highlight_url ?? '';

    // Mesma regra do available-hours: só livres públicos e não passados.
    const candidateSchedules = visibleCourts.flatMap((court) =>
      (court.court_schedule ?? [])
        .filter((schedule) => schedule.available)
        .map((schedule) => {
          schedule.court = court;
          return schedule;
        }),
    );
    const publicSchedules = await this.excludeInternalOperatingHours(
      candidateSchedules,
    );
    const openSchedules = publicSchedules.filter(
      (schedule) => !isCourtScheduleInPast(schedule.date, schedule.start_hour),
    );
    const openByCourtId = new Map<number, typeof openSchedules>();
    for (const schedule of openSchedules) {
      const courtId = schedule.court_id ?? schedule.court?.id;
      if (courtId == null) continue;
      const list = openByCourtId.get(courtId) ?? [];
      list.push(schedule);
      openByCourtId.set(courtId, list);
    }

    const objToFront: IDetailsCourt = {
      logoUrl: company.logo_url,
      name: company.name,
      phone: company.phone,
      slug: company.slug,
      instagramUrl: company.instagram_url ?? '',
      city: company.city,
      uf: company.uf,
      address: `${company.street}, ${company.number} - ${company.neighborhood}, ${company.city} - ${company.uf}`,
      courts: visibleCourts.map((court) => {
        const courtSports = (court.court_sports ?? []).map((sport) => ({
          label: sport.name,
          value: String(sport.id),
        }));
        const schedules = (openByCourtId.get(court.id) ?? []).map(
          (schedule) => ({
            date: schedule.date,
            startHour: schedule.start_hour.slice(0, 5),
            price: schedule.price,
            courtName: court.name,
            courtSports,
            dayOfWeekAbb: schedule.day_of_week?.description
              ? `(${schedule.day_of_week.description.slice(0, 3).toLowerCase()})`
              : '',
          }),
        );
        return {
          courtName: court.name,
          courtSports,
          schedules,
        };
      }),
      characteristics: company.characteristics ?? [],
      photoHighlightUrl,
      photoUrls:
        photoUrls.length > 0
          ? photoUrls
          : photoHighlightUrl
            ? [photoHighlightUrl]
            : [],
    };

    return objToFront;
  }

  async findAvailableHoursByCourt({
    slug,
    date,
  }: {
    slug?: string;
    date: Date;
  }): Promise<ICourt[]> {
    const dateKey = this.toDateKey(date);
    const cacheKey = `hours:${slug || ''}:${dateKey}`;

    return this.publicListingCache.getOrSet(cacheKey, () =>
      this.loadAvailableHoursByCourt(slug, date),
    );
  }

  private async loadAvailableHoursByCourt(
    slug: string | undefined,
    date: Date,
  ): Promise<ICourt[]> {
    const courtSchedule = await this.courtSchedulesRepository.find({
      where: {
        available: true,
        date,
        court: {
          show: true,
          company: portalCompanyWhere({ slug }),
        },
      },
      relations: {
        court: {
          court_sports: true,
        },
        day_of_week: true,
      },
      select: {
        date: true,
        start_hour: true,
        price: true,
        court_id: true,
        day_of_week_id: true,
        court: {
          id: true,
          name: true,
          court_sports: {
            id: true,
            name: true,
          },
        },
        day_of_week: {
          description: true,
        },
      },
      order: {
        start_hour: 'ASC',
      },
    });

    const publicSchedules = await this.excludeInternalOperatingHours(
      courtSchedule,
    );

    const openSchedules = publicSchedules.filter(
      (item) => !isCourtScheduleInPast(item.date, item.start_hour),
    );

    if (openSchedules.length === 0) {
      return [];
    }

    const groupedCourts: Record<string, ICourt> = {};

    openSchedules.forEach((item) => {
      const courtKey = item.court.name; // ou `${item.court.name}-${item.court.company_id}` se quiser segurança

      if (!groupedCourts[courtKey]) {
        groupedCourts[courtKey] = {
          courtName: item.court.name,
          courtSports: item.court.court_sports.map((sport) => ({
            label: sport.name,
            value: String(sport.id),
          })),
          schedules: [],
        };
      }

      groupedCourts[courtKey].schedules.push({
        date: item.date,
        startHour: item.start_hour.slice(0, 5),
        price: item.price,
        courtName: item.court.name,
        courtSports: item.court.court_sports.map((sport) => ({
          label: sport.name,
          value: String(sport.id),
        })),
        dayOfWeekAbb: `(${item.day_of_week.description.slice(0, 3).toLowerCase()})`,
      });
    });

    const objToFront: ICourt[] = Object.values(groupedCourts);
    return objToFront;
  }

  /**
   * Checagem ao vivo (sem cache) para o modal do portal.
   * Mesmas regras da listagem: disponível, público, não passado, arena ativa.
   */
  async checkPublicSlotAvailable(params: {
    slug: string;
    date: string;
    startHour: string;
    courtName: string;
  }): Promise<{ available: boolean }> {
    const dateKey = this.toDateKey(params.date);
    const hourKey = params.startHour.slice(0, 5);
    const courtName = params.courtName.trim();
    const slug = params.slug.trim();
    if (!dateKey || !hourKey || !courtName || !slug) {
      return { available: false };
    }

    const candidates = await this.courtSchedulesRepository.find({
      where: {
        available: true,
        date: dateKey as unknown as Date,
        court: {
          name: courtName,
          show: true,
          company: portalCompanyWhere({ slug }),
        },
      },
      relations: {
        court: true,
      },
      select: {
        id: true,
        date: true,
        start_hour: true,
        court_id: true,
        day_of_week_id: true,
        court: {
          id: true,
          name: true,
        },
      },
    });

    const match = candidates.find(
      (item) => String(item.start_hour).slice(0, 5) === hourKey,
    );
    if (!match) {
      return { available: false };
    }
    if (isCourtScheduleInPast(match.date, match.start_hour)) {
      return { available: false };
    }

    const publicSlots = await this.excludeInternalOperatingHours([match]);
    return { available: publicSlots.length === 1 };
  }

  async findAllCourts(): Promise<{ slug: string; updatedAt: Date }[]> {
    const companies = await this.companyRepository.find({
      where: portalCompanyWhere(),
      select: {
        slug: true,
        updated_at: true,
      },
    });

    const objToFront: { slug: string; updatedAt: Date }[] = companies.map(
      (item) => ({
        slug: item.slug,
        updatedAt: item.updated_at,
      }),
    );

    return objToFront;
  }

  /** Arenas ativas com página pública — prova social na LP. */
  async findPartnerArenas(): Promise<
    { name: string; slug: string; logoUrl: string | null }[]
  > {
    const companies = await this.companyRepository.find({
      where: portalCompanyWhere(),
      select: {
        name: true,
        slug: true,
        logo_url: true,
      },
      order: {
        name: 'ASC',
      },
    });

    return companies
      .filter((company) => Boolean(company.slug?.trim()))
      .map((company) => ({
        name: company.name,
        slug: company.slug.trim(),
        logoUrl: company.logo_url ?? null,
      }));
  }

  async quickCreate(
    body: {
      start_hour: string;
      date: string;
      court_id: number;
      price?: number;
    },
    ownerPublicId: string,
  ) {
    await this.assertCourtOwnedBy(body.court_id, ownerPublicId);
    const dateKey = this.toDateKey(body.date);
    const existingSchedule = await this.courtSchedulesRepository.findOne({
      where: {
        start_hour: body.start_hour,
        date: dateKey as unknown as Date,
        court_id: body.court_id,
      },
    });

    if (existingSchedule) {
      throw new BadRequestException('O horário já existe');
    }

    if (isCourtScheduleInPast(dateKey, body.start_hour)) {
      throw new BadRequestException(
        'Não é possível criar um horário que já passou.',
      );
    }

    if (
      body.price !== undefined &&
      (body.price < 0 || body.price > MAX_COURT_PRICE_REAIS)
    ) {
      throw new BadRequestException(
        `O valor máximo por horário é R$ ${MAX_COURT_PRICE_REAIS},00.`,
      );
    }

    // Parse local (Y, M-1, D) — evita UTC midnight virar D-1 em America/Sao_Paulo.
    const day_of_week_id = weekdayRefFromDateKey(dateKey) + 1;

    const operatingSchedule = await this.operatingScheduleRepository.findOne({
      where: {
        court_id: body.court_id,
        hour: body.start_hour,
        day_of_week_id,
      },
      select: {
        price: true,
      },
    });

    const startTime = parse(body.start_hour, 'HH:mm', new Date());
    const endTime = addHours(startTime, 1);
    const end_hour = format(endTime, 'HH:mm');

    const schedule: CreateCourtScheduleDto = {
      start_hour: body.start_hour,
      end_hour,
      date: dateKey as unknown as Date,
      available: true,
      price: body.price ?? operatingSchedule?.price ?? 0,
      is_fixed: false,
      court_id: body.court_id,
      day_of_week_id,
      sport_id: null,
    };

    return this.create(schedule, ownerPublicId);
  }
}
