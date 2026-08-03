import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { Between, ILike, In, IsNull, MoreThan, Not, Repository } from 'typeorm';
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
import { CompanyCustomer } from 'src/companies-customer/entities/company-customer.entity';
import {
  IAvailableHours,
  ICourt,
  IDetailsCourt,
  IWhereToPlayCourtList,
} from './interfaces';
import { Company } from 'src/companies/entities/company.entity';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { addHours, format, parse } from 'date-fns';
import { isCourtScheduleInPast } from 'src/utils/isCourtScheduleInPast';
import { PublicListingCache } from 'src/cache/public-listing.cache';
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

export enum ReservationStatusEnum {
  FIXED = 'fixed',
  INACTIVE = 'inactive',
  RESERVED = 'reserved',
  AVAILABLE = 'available',
  PREPAID = 'prepaid',
  UNKNOWN = 'unknown',
}

interface IReservationDetailsItemProps {
  scheduleId: string;
  status: ReservationStatusEnum;
  date: string;
  reservation: {
    publicId: string;
    createdAt: string;
    isPrepaid: boolean;
    contactName: string;
    contactPhone: string;
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
    private readonly publicListingCache: PublicListingCache,
  ) {}

  /** Normaliza date de query (string | Date) para YYYY-MM-DD. */
  private toDateKey(date?: Date | string): string {
    return toDateKey(date);
  }

  invalidatePublicListingCache(): void {
    this.publicListingCache.clear();
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
    await this.assertCourtOwnedBy(
      createCourtScheduleDto.court_id,
      ownerPublicId,
    );
    const courtSchedule = this.courtSchedulesRepository.create(
      createCourtScheduleDto,
    );
    const saved = await this.courtSchedulesRepository.save(courtSchedule);
    this.publicListingCache.clear();
    return saved;
  }

  async populateCourtSchedule(
    court_id: number,
    start_date: string,
    end_date: string,
    ownerPublicId?: string,
  ) {
    if (ownerPublicId) {
      await this.assertCourtOwnedBy(court_id, ownerPublicId);
    }
    return await this.courtSchedulesRepository.manager.transaction(
      async (manager) => {
        const operating_schedule = await manager
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
              company_customer_id: item.company_customer_id,
              sport_id: item.sport_id,
              is_active: item.is_active,
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
                !operatingSchedule.is_fixed && operatingSchedule.is_active,
              is_fixed: operatingSchedule.is_fixed,
              company_customer_id: operatingSchedule.is_fixed
                ? operatingSchedule.company_customer_id
                : null,
              sport_id: operatingSchedule.sport_id,
            };
            newsCourtSchedule.push(newCourtSchedule);
          }
        }

        let createdSchedules;
        try {
          const existingSchedules = await manager
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

          const createdSchedulesRaw = await manager
            .getRepository(CourtSchedule)
            .save(filteredSchedules);

          createdSchedules = await manager.getRepository(CourtSchedule).find({
            where: { id: In(createdSchedulesRaw.map((s) => s.id)) },
            relations: { company_customer: true },
          });

          console.log(
            `[Grade] ${createdSchedules.length} novos horários adicionados para a quadra ${court_id} entre ${start_date} e ${end_date}.`,
          );

          for (const schedule of createdSchedules) {
            if (schedule.is_fixed && schedule.company_customer_id) {
              if (!schedule.sport_id) {
                throw new Error(
                  'Não é possível popular uma reserva sem o vínculo do esporte.',
                );
              }
              reservationsToCreate.push({
                court_schedule: schedule,
                contact_name: schedule.company_customer?.name,
                contact_phone: schedule.company_customer?.phone,
                sport_id: schedule.sport_id,
              });
            }
          }

          if (reservationsToCreate.length > 0) {
            await manager.getRepository(Reservation).save(reservationsToCreate);
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
      },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCron() {
    // Quadra oculta (show=false) continua gerando; só pula company inativa.
    // Onboarding / POST populate seguem livres para popular na mão.
    const courts = await this.courtRepository.find({
      where: {
        company: {
          is_active: true,
          partner_status: PartnerStatus.ACTIVE,
          plan_id: Not(IsNull()),
        },
      },
      relations: { company: true },
    });
    const todayKey = todayDateKey();
    const endKey = addDaysToDateKey(todayKey, 89);

    console.log(
      `Iniciando verificação de horários faltantes para ${courts.length} quadras (companies ativas)`,
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

  findAll({
    courtId,
    city,
    date,
    hour,
    typeOfCourtId,
  }: UrlQueryParamCourtScheduleDto) {
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
        reservation: {
          public_id: true,
          is_prepaid: true,
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

    const obj: IReservationDetailsItemProps = {
      scheduleId: courtSchedule.public_id,
      status: getStatusCourtSchedule(courtSchedule),
      date: formatDateDateToDDMMYYYY(String(courtSchedule.date)),
      reservation: courtSchedule.reservation
        ? {
            createdAt: formatDateTimestampToDDMMYYYY(
              courtSchedule?.reservation?.created_at,
            ),
            isPrepaid: courtSchedule.reservation?.is_prepaid,
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
    await this.assertScheduleOwnedBy(publicId, ownerPublicId);
    return this.courtSchedulesRepository.delete({ public_id: publicId });
  }

  async updateAvailability(
    publicId: string,
    available: boolean,
    ownerPublicId: string,
  ) {
    await this.assertScheduleOwnedBy(publicId, ownerPublicId);
    const result = await this.courtSchedulesRepository.update(
      { public_id: publicId },
      available
        ? { available: true, closed_by_day: false }
        : { available: false, closed_by_day: false },
    );
    this.publicListingCache.clear();
    return result;
  }

  /**
   * Fecha (available=false) ou reabre (available=true) o dia.
   * Fecha: só livres; marca closed_by_day.
   * Reabre: só horários com closed_by_day (não reabre inativação manual).
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
          return schedule.closed_by_day;
        }
        return schedule.available;
      })
      .map((schedule) => schedule.id);

    if (targetIds.length > 0) {
      await this.courtSchedulesRepository.update(
        { id: In(targetIds) },
        available
          ? { available: true, closed_by_day: false }
          : { available: false, closed_by_day: true },
      );
      this.publicListingCache.clear();
    }

    return {
      updated: targetIds.length,
      date: dateKey,
      available,
      isDayClosed: available
        ? schedules.some(
            (s) => s.closed_by_day && !targetIds.includes(s.id),
          )
        : targetIds.length > 0 ||
          schedules.some((s) => s.closed_by_day),
    };
  }

  async fixSchedule(
    body: { court_schedule_public_id: string },
    ownerPublicId: string,
  ) {
    await this.assertScheduleOwnedBy(
      body.court_schedule_public_id,
      ownerPublicId,
    );
    const result = await this.courtSchedulesRepository.manager.transaction(
      async (manager) => {
        const courtSchedule = await manager
          .getRepository(CourtSchedule)
          .findOne({
            where: { public_id: body.court_schedule_public_id },
            relations: ['reservation', 'court'],
          });
        if (!courtSchedule) {
          throw new NotFoundException('Horário não encontrado');
        }
        if (!courtSchedule.reservation || !courtSchedule.reservation.id) {
          throw new NotFoundException('Horário não possui reserva');
        }

        let companyCustomerId: number | null = null;

        const companyCustomer = await manager
          .getRepository(CompanyCustomer)
          .findOne({
            where: {
              phone: courtSchedule.reservation.contact_phone,
              name: courtSchedule.reservation.contact_name,
            },
          });

        if (!companyCustomer) {
          const newCompanyCustomer = manager
            .getRepository(CompanyCustomer)
            .create({
              phone: courtSchedule.reservation.contact_phone,
              name: courtSchedule.reservation.contact_name,
              company_id: courtSchedule.court.company_id,
            });
          await manager.getRepository(CompanyCustomer).save(newCompanyCustomer);
          companyCustomerId = newCompanyCustomer.id;
        } else {
          companyCustomerId = companyCustomer.id;
        }

        const sportId = courtSchedule.reservation.sport_id;
        const contactName = courtSchedule.reservation.contact_name;
        const contactPhone = courtSchedule.reservation.contact_phone;

        await manager.getRepository(CourtSchedule).update(
          { id: courtSchedule.id },
          {
            is_fixed: true,
            available: false,
            company_customer_id: companyCustomerId,
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
          throw new NotFoundException(
            'Horário de funcionamento não encontrado',
          );
        }

        await manager.getRepository(OperatingSchedule).update(
          {
            court_id: operatingSchedule.court_id,
            day_of_week_id: operatingSchedule.day_of_week_id,
            hour: operatingSchedule.hour,
          },
          {
            is_fixed: true,
            company_customer_id: companyCustomerId,
            sport_id: sportId,
          },
        );

        const futureSchedules = await manager.getRepository(CourtSchedule).find({
          where: {
            start_hour: courtSchedule.start_hour,
            day_of_week_id: courtSchedule.day_of_week_id,
            court_id: courtSchedule.court_id,
            public_id: Not(body.court_schedule_public_id),
            date: MoreThan(courtSchedule.date),
          },
          relations: ['reservation'],
        });

        for (const schedule of futureSchedules) {
          const reservation = schedule.reservation;
          if (
            reservation &&
            (reservation.contact_name !== contactName ||
              reservation.contact_phone !== contactPhone)
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
              company_customer_id: companyCustomerId,
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
                contact_phone: contactPhone,
                sport_id: sportId,
              })),
            );
          }
        }

        return { message: 'Horário fixado com sucesso' };
      },
    );
    this.publicListingCache.clear();
    return result;
  }

  async unfixSchedule(
    body: { court_schedule_public_id: string },
    ownerPublicId: string,
  ) {
    await this.assertScheduleOwnedBy(
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

        await manager.getRepository(CourtSchedule).update(
          { id: courtSchedule.id },
          {
            is_fixed: false,
            company_customer_id: null,
            sport_id: null,
            available: true,
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
        if (!operatingSchedule)
          throw new NotFoundException('OperatingSchedule não encontrado');

        await manager.getRepository(OperatingSchedule).update(
          {
            court_id: operatingSchedule.court_id,
            day_of_week_id: operatingSchedule.day_of_week_id,
            hour: operatingSchedule.hour,
          },
          {
            is_fixed: false,
            company_customer_id: null,
            sport_id: null,
          },
        );

        await manager.getRepository(Reservation).delete({
          court_schedule_id: courtSchedule.id,
        });

        const futureCourtSchedules = await manager
          .getRepository(CourtSchedule)
          .find({
            where: {
              start_hour: courtSchedule.start_hour,
              day_of_week_id: courtSchedule.day_of_week_id,
              court_id: courtSchedule.court_id,
              date: MoreThan(courtSchedule.date),
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
              company_customer_id: null,
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

        return { message: 'Horário desafixado com sucesso' };
      },
    );
    this.publicListingCache.clear();
    return result;
  }

  // Marca Pra Nós público
  async findWhereToPlay({
    city,
    uf,
    date,
  }: {
    city?: string;
    uf?: string;
    date?: Date;
  }) {
    const ufNorm = uf?.trim().toUpperCase() || '';
    const cityNorm = city?.trim() || '';
    const dateKey = this.toDateKey(date);
    const cacheKey = `wtp:${dateKey}:${ufNorm}:${cityNorm.toLowerCase()}`;

    return this.publicListingCache.getOrSet(cacheKey, () =>
      this.loadWhereToPlay({ cityNorm, ufNorm, date }),
    );
  }

  private async loadWhereToPlay({
    cityNorm,
    ufNorm,
    date,
  }: {
    cityNorm: string;
    ufNorm: string;
    date?: Date;
  }) {
    const courtSchedule = await this.courtSchedulesRepository.find({
      where: {
        available: true,
        date,
        court: {
          show: true,
          company: {
            ...(ufNorm ? { uf: ILike(ufNorm) } : {}),
            ...(cityNorm ? { city: ILike(cityNorm) } : {}),
            is_active: true,
            partner_status: PartnerStatus.ACTIVE,
            plan_id: Not(IsNull()),
            access_mode: AccessMode.FULL,
          },
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

    // Público: não listar horários cujo início já passou
    const openSchedules = courtSchedule.filter(
      (item) => !isCourtScheduleInPast(item.date, item.start_hour),
    );

    const groupedByCompany = openSchedules.reduce(
      (acc, item) => {
        const companyId = item.court.company.id; // ou public_id
        const companyKey = `${item.court.company.name}-${item.court.company.phone}`;

        if (!acc[companyKey]) {
          acc[companyKey] = {
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

        const courtKey = `${item.court.name}-${companyId}`;
        let courtGroup = acc[companyKey].courts.find(
          (court) => `${court.courtName}-${companyId}` === courtKey,
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
      {} as Record<string, IWhereToPlayCourtList>,
    );

    const result: IWhereToPlayCourtList[] = Object.values(groupedByCompany);

    const objToReturn = {
      courtsWithHours: result,
      // Arenas sem entitlement comercial não aparecem no portal.
      courtsWithoutHours: [] as Array<{
        logoUrl: string | null;
        name: string;
        phone: string | null;
        slug: string;
        instagramUrl: string;
        city: string | null;
        uf: string | null;
        address: string;
      }>,
    };

    return objToReturn;
  }

  async findStatesToPlay() {
    const companies = await this.companyRepository.find({
      where: {
        is_active: true,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: Not(IsNull()),
        access_mode: AccessMode.FULL,
      },
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
      where: {
        is_active: true,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: Not(IsNull()),
        access_mode: AccessMode.FULL,
        ...(ufNorm ? { uf: ILike(ufNorm) } : {}),
      },
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
    const rows = await this.courtRepository
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
      })
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
    const company = await this.companyRepository
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
      })
      .getOne();

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

    const objToFront: IDetailsCourt = {
      logoUrl: company.logo_url,
      name: company.name,
      phone: company.phone,
      slug: company.slug,
      instagramUrl: company.instagram_url ?? '',
      city: company.city,
      uf: company.uf,
      address: `${company.street}, ${company.number} - ${company.neighborhood}, ${company.city} - ${company.uf}`,
      courts: visibleCourts.map((court) => ({
        courtName: court.name,
        courtSports: (court.court_sports ?? []).map((sport) => ({
          label: sport.name,
          value: String(sport.id),
        })),
        schedules: (court.court_schedule ?? []).map((schedule) => ({
          date: schedule.date,
          startHour: schedule.start_hour.slice(0, 5),
          price: schedule.price,
          courtName: court.name,
          courtSports: (court.court_sports ?? []).map((sport) => ({
            label: sport.name,
            value: String(sport.id),
          })),
          dayOfWeekAbb: schedule.day_of_week?.description
            ? `(${schedule.day_of_week.description.slice(0, 3).toLowerCase()})`
            : '',
        })),
      })),
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
          company: {
            slug,
            is_active: true,
            partner_status: PartnerStatus.ACTIVE,
            plan_id: Not(IsNull()),
            access_mode: AccessMode.FULL,
          },
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

    const openSchedules = courtSchedule.filter(
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

  async findAllCourts(): Promise<{ slug: string; updatedAt: Date }[]> {
    const companies = await this.companyRepository.find({
      where: {
        is_active: true,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: Not(IsNull()),
        access_mode: AccessMode.FULL,
      },
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
      where: {
        is_active: true,
        partner_status: PartnerStatus.ACTIVE,
        plan_id: Not(IsNull()),
        access_mode: AccessMode.FULL,
      },
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

    if (
      body.price !== undefined &&
      (body.price < 0 || body.price > MAX_COURT_PRICE_REAIS)
    ) {
      throw new BadRequestException(
        `O valor máximo por horário é R$ ${MAX_COURT_PRICE_REAIS},00.`,
      );
    }

    const operatingSchedule = await this.operatingScheduleRepository.findOne({
      where: {
        court_id: body.court_id,
        hour: body.start_hour,
      },
      select: {
        price: true,
      },
    });

    const startTime = parse(body.start_hour, 'HH:mm', new Date());
    const endTime = addHours(startTime, 1);
    const end_hour = format(endTime, 'HH:mm');

    // Parse local (Y, M-1, D) — evita UTC midnight virar D-1 em America/Sao_Paulo.
    const day_of_week_id = weekdayRefFromDateKey(dateKey) + 1;

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
