import { Injectable, NotFoundException } from '@nestjs/common';
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
import { JwtService } from 'src/jwt/jwt.service';
import {
  IAvailableHours,
  ICourt,
  IDetailsCourt,
  IWhereToPlayCourtList,
} from './interfaces';
import { Company } from 'src/companies/entities/company.entity';
import { addHours, format, parse } from 'date-fns';
import { PlanEnum } from 'src/plans/enum/enum';

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
    tokenToCancel: string;
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
    private readonly jwtService: JwtService,
  ) {}
  create(createCourtScheduleDto: CreateCourtScheduleDto) {
    const courtSchedule = this.courtSchedulesRepository.create(
      createCourtScheduleDto,
    );
    return this.courtSchedulesRepository.save(courtSchedule);
  }

  async populateCourtSchedule(
    court_id: number,
    start_date: string,
    end_date: string,
  ) {
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

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const newsCourtSchedule: CreateCourtScheduleDto[] = [];
        const reservationsToCreate: Partial<Reservation>[] = [];

        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const weekdayRef = currentDate.getDay();

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
              date: new Date(currentDate.toISOString().split('T')[0]),
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

          currentDate.setDate(currentDate.getDate() + 1);
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
              const dateObj = new Date(s.date);
              const [hour, minute] = s.start_hour.split(':');
              const startHour = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
              return `${dateObj.toISOString().split('T')[0]}-${startHour}`;
            }),
          );

          const filteredSchedules = newsCourtSchedule.filter((s) => {
            const dateStr = s.date.toISOString().split('T')[0];
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
                token_to_cancel: this.jwtService.generateToken(schedule.id),
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
    const courts = await this.courtRepository.find();
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 89);

    console.log(
      `Iniciando verificação de horários faltantes para ${courts.length} quadras`,
    );

    for (const court of courts) {
      const operatingSchedule = await this.operatingScheduleRepository.find({
        where: { court_id: court.id },
        relations: { day_of_week: true },
      });

      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const weekdayRef = d.getDay();

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
              date: new Date(d.toISOString().split('T')[0]),
            },
          });

        if (existingSchedulesCount < expectedSlots.length) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            await this.populateCourtSchedule(court.id, dateStr, dateStr);
            console.log(
              `Criados horários faltantes para quadra ${court.id} no dia ${dateStr}`,
            );
          } catch (error) {
            console.error(
              `Erro ao popular quadra ${court.id} no dia ${dateStr}:`,
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

  async findOneByPublicId(publicId: string) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: publicId },
      relations: {
        day_of_week: true,
        court: { court_sports: true, company: true },
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
          token_to_cancel: true,
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
          },
        },
        price: true,
        day_of_week: {
          description: true,
        },
      },
    });

    if (!courtSchedule) {
      throw new Error('Horário de quadra não encontrado');
    }

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
            tokenToCancel: courtSchedule.reservation?.token_to_cancel,
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
  ) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: publicId },
    });
    if (!courtSchedule) {
      throw new Error('Horário de quadra não encontrado');
    }
    this.courtSchedulesRepository.merge(courtSchedule, updateCourtScheduleDto);
    return this.courtSchedulesRepository.save(courtSchedule);
  }

  removeByPublicId(publicId: string) {
    return this.courtSchedulesRepository.delete({ public_id: publicId });
  }

  updateAvailability(publicId: string, available: boolean) {
    return this.courtSchedulesRepository.update(
      { public_id: publicId },
      { available },
    );
  }

  async fixSchedule(body: { court_schedule_public_id: string }) {
    return await this.courtSchedulesRepository.manager.transaction(
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

        courtSchedule.is_fixed = true;
        courtSchedule.available = false;
        courtSchedule.company_customer_id = companyCustomerId;
        courtSchedule.sport_id = courtSchedule.reservation.sport_id;

        await manager.getRepository(CourtSchedule).save(courtSchedule);

        const operatingSchedule = await manager
          .getRepository(OperatingSchedule)
          .findOne({
            where: {
              court_id: courtSchedule.court_id,
              day_of_week_id: courtSchedule.day_of_week_id,
              hour: courtSchedule.start_hour,
            },
            relations: ['company_customer'],
          });
        if (!operatingSchedule) {
          throw new NotFoundException(
            'Horário de funcionamento não encontrado',
          );
        }

        operatingSchedule.is_fixed = true;
        operatingSchedule.company_customer_id = companyCustomerId;
        operatingSchedule.sport_id = courtSchedule.reservation.sport_id;

        await manager.getRepository(OperatingSchedule).save(operatingSchedule);

        const courtSchedules = await manager.getRepository(CourtSchedule).find({
          where: {
            start_hour: courtSchedule.start_hour,
            day_of_week_id: courtSchedule.day_of_week_id,
            court_id: courtSchedule.court_id,
            public_id: Not(body.court_schedule_public_id),
            date: MoreThan(courtSchedule.date),
          },
          relations: ['reservation'],
        });

        for (const schedule of courtSchedules) {
          schedule.is_fixed = true;
          schedule.available = false;
          schedule.company_customer_id = companyCustomerId;
          schedule.sport_id = courtSchedule.reservation.sport_id;
          await manager.getRepository(CourtSchedule).save(schedule);

          const existingReservations = await manager
            .getRepository(Reservation)
            .find({
              where: {
                court_schedule_id: schedule.id,
              },
            });

          if (
            existingReservations.length > 0 &&
            existingReservations.some(
              (reservation) =>
                reservation.contact_name !==
                  courtSchedule.reservation.contact_name ||
                reservation.contact_phone !==
                  courtSchedule.reservation.contact_phone,
            )
          ) {
            throw new NotFoundException(
              `Não é possível fixar: já existem reservas feitas para este horário no dia ${formatDateDateToDDMMYYYY(String(schedule.date))} para ${schedule.reservation.contact_name}`,
            );
          }

          if (!schedule.reservation?.id) {
            const reservationRepo = manager.getRepository(Reservation);
            const reservation = reservationRepo.create({
              court_schedule_id: schedule.id,
              contact_name: courtSchedule.reservation.contact_name,
              contact_phone: courtSchedule.reservation.contact_phone,
              sport_id: courtSchedule.reservation.sport_id,
            });
            await reservationRepo.save(reservation);
            reservation.token_to_cancel = this.jwtService.generateToken(
              reservation.id,
            );
            await reservationRepo.save(reservation);
          }
        }
        return { message: 'Horário fixado com sucesso' };
      },
    );
  }

  async unfixSchedule(body: { court_schedule_public_id: string }) {
    return await this.courtSchedulesRepository.manager.transaction(
      async (manager) => {
        const courtSchedule = await manager
          .getRepository(CourtSchedule)
          .findOne({
            where: { public_id: body.court_schedule_public_id },
          });
        if (!courtSchedule)
          throw new NotFoundException('CourtSchedule não encontrado');

        courtSchedule.is_fixed = false;
        courtSchedule.company_customer_id = null;
        courtSchedule.sport_id = null;
        courtSchedule.available = true;
        await manager.getRepository(CourtSchedule).save(courtSchedule);

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
        operatingSchedule.is_fixed = false;
        operatingSchedule.company_customer_id = null;
        operatingSchedule.sport_id = null;
        await manager.getRepository(OperatingSchedule).save(operatingSchedule);

        await manager.getRepository(Reservation).delete({
          court_schedule: { id: courtSchedule.id },
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
          });

        for (const schedule of futureCourtSchedules) {
          schedule.is_fixed = false;
          schedule.company_customer_id = null;
          schedule.sport_id = null;
          schedule.available = true;
          await manager.getRepository(CourtSchedule).save(schedule);
          await manager.getRepository(Reservation).delete({
            court_schedule_id: schedule.id,
          });
        }

        return { message: 'Horário desafixado com sucesso' };
      },
    );
  }

  // Marca Pra Nós público
  async findWhereToPlay({ city, date }: { city?: string; date?: Date }) {
    const courtSchedule = await this.courtSchedulesRepository.find({
      where: {
        available: true,
        date,
        court: {
          company: {
            city: ILike(`%${city}%`),
            is_active: true,
            plan_id: Not(PlanEnum.PENDENCE),
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
          name: true,
          company: {
            logo_url: true,
            instagram_url: true,
            name: true,
            phone: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            uf: true,
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

    const companiesWithoutPlan = await this.companyRepository.find({
      where: [
        { plan_id: IsNull(), is_active: true },
        { plan_id: PlanEnum.PENDENCE, is_active: true },
      ],
      select: {
        public_id: true,
        plan_id: true,
        logo_url: true,
        instagram_url: true,
        name: true,
        phone: true,
        street: true,
        number: true,
        neighborhood: true,
        city: true,
        uf: true,
      },
    });

    const groupedByCompany = courtSchedule.reduce(
      (acc, item) => {
        const companyId = item.court.company.id; // ou public_id
        const companyKey = `${item.court.company.name}-${item.court.company.phone}`;

        if (!acc[companyKey]) {
          acc[companyKey] = {
            logoUrl: item.court.company.logo_url,
            name: item.court.company.name,
            phone: item.court.company.phone,
            instagramUrl: item.court.company.instagram_url ?? '',
            city: item.court.company.city,
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
      courtsWithoutHours: companiesWithoutPlan.map((company) => ({
        logoUrl: company.logo_url,
        name: company.name,
        phone: company.phone,
        instagramUrl: company.instagram_url ?? '',
        city: company.city,
        address: `${company.street}, ${company.number} - ${company.neighborhood}, ${company.city} - ${company.uf}`,
      })),
    };

    return objToReturn;
  }

  async findCitiesToPlay() {
    const companies = await this.companyRepository.find({
      where: { is_active: true },
      select: ['city'],
      order: { city: 'ASC' },
    });

    const uniqueCities = Array.from(
      new Set(companies.map((item) => item.city)),
    );

    return uniqueCities.map((city) => ({
      label: city,
      value: city,
    }));
  }

  async findSportsToPlay() {
    const courts = await this.courtRepository.find({
      where: { company: { is_active: true } },
      relations: {
        court_sports: true,
      },
      select: ['court_sports'],
    });

    const sportMap = new Map<number, { label: string; value: number }>();

    courts.forEach((court) => {
      court.court_sports.forEach((sport: { id: number; name: string }) => {
        if (!sportMap.has(sport.id)) {
          sportMap.set(sport.id, { label: sport.name, value: sport.id });
        }
      });
    });

    const uniqueSportOptions = Array.from(sportMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    return uniqueSportOptions;
  }

  async findDetailsCourt({
    slug,
  }: {
    slug?: string;
    date: Date;
  }): Promise<IDetailsCourt> {
    const company = await this.companyRepository.findOne({
      where: {
        instagram_url: ILike(`%/${slug}`),
        is_active: true,
      },
      relations: {
        courts: {
          court_sports: true,
          court_schedule: true,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        logo_url: true,
        instagram_url: true,
        street: true,
        number: true,
        neighborhood: true,
        city: true,
        uf: true,
        photo_highlight_url: true,
        characteristics: true,
        courts: {
          id: true,
          name: true,
          court_sports: {
            id: true,
            name: true,
          },
          court_schedule: true,
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Quadra não encontrada');
    }

    const objToFront: IDetailsCourt = {
      logoUrl: company.logo_url,
      name: company.name,
      phone: company.phone,
      instagramUrl: company.instagram_url ?? '',
      address: `${company.street}, ${company.number} - ${company.neighborhood}, ${company.city} - ${company.uf}`,
      courts: company.courts.map((court) => ({
        courtName: court.name,
        courtSports: court.court_sports.map((sport) => ({
          label: sport.name,
          value: String(sport.id),
        })),
        schedules: court.court_schedule.map((schedule) => ({
          date: schedule.date,
          startHour: schedule.start_hour.slice(0, 5),
          price: schedule.price,
          courtName: court.name,
          courtSports: court.court_sports.map((sport) => ({
            label: sport.name,
            value: String(sport.id),
          })),
          dayOfWeekAbb: `(${schedule.day_of_week?.description.slice(0, 3).toLowerCase()})`,
        })),
      })),
      characteristics: company.characteristics ?? [],
      photoHighlightUrl: company.photo_highlight_url ?? '',
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
    const courtSchedule = await this.courtSchedulesRepository.find({
      where: {
        available: true,
        date,
        court: {
          company: {
            instagram_url: ILike(`%/${slug}`),
            is_active: true,
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
          name: true,
          court_sports: {
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

    if (courtSchedule.length === 0) {
      return [];
    }

    const groupedCourts: Record<string, ICourt> = {};

    courtSchedule.forEach((item) => {
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
      },
      select: {
        instagram_url: true,
        updated_at: true,
      },
    });

    const objToFront: { slug: string; updatedAt: Date }[] = companies.map(
      (item) => ({
        slug: item.instagram_url?.split('/').filter(Boolean).pop() ?? '',
        updatedAt: item.updated_at,
      }),
    );

    return objToFront;
  }

  async quickCreate(body: {
    start_hour: string;
    date: string;
    court_id: number;
    price?: number;
  }) {
    const existingSchedule = await this.courtSchedulesRepository.findOne({
      where: {
        start_hour: body.start_hour,
        date: new Date(body.date),
        court_id: body.court_id,
      },
    });

    if (existingSchedule) {
      throw new Error('O horário já existe');
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

    const dateObj = new Date(body.date);
    const day_of_week_id = dateObj.getDay() + 1;

    const schedule: CreateCourtScheduleDto = {
      start_hour: body.start_hour,
      end_hour,
      date: new Date(body.date),
      available: true,
      price: body.price ?? operatingSchedule?.price ?? 0,
      is_fixed: false,
      court_id: body.court_id,
      day_of_week_id,
      sport_id: null,
    };

    return this.create(schedule);
  }
}
