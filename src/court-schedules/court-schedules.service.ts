import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { Between, ILike, In, Repository } from 'typeorm';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { UrlQueryParamCourtScheduleDto } from './dto/url-query-param-court-schedule.dto';
import { instanceToPlain } from 'class-transformer';
import { getStatusCourtSchedule } from 'src/utils/getStatusCourtSchedulet';
import { formatDateDateToDDMMYYYY, formatDateTimestampToDDMMYYYY } from 'src/utils/formatDate';
import { Court } from 'src/courts/entities/court.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { CompanyCustomer } from 'src/companies-customer/entities/company-customer.entity';
import { ReservationsService } from 'src/reservations/reservations.service';
import { JwtService } from 'src/jwt/jwt.service';

export enum ReservationStatusEnum {
  FIXED = "fixed",
  INACTIVE = "inactive",
  RESERVED = "reserved",
  AVAILABLE = "available",
  PREPAID = "prepaid",
  UNKNOWN = "unknown",
}

interface IReservationDetailsItemProps {
  scheduleId: string;
  status: ReservationStatusEnum;
  date: string;
  reservation: {
    createdAt: string;
    isPrepaid: boolean;
    contactName: string;
    contactPhone: string;
    tokenToCancel: string;
  } | null;
  court: string;
  time: string;
  price: number;
  weekday: string;
}

@Injectable()
export class CourtSchedulesService {
  constructor(
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly jwtService: JwtService
  ) { }
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
    return await this.courtSchedulesRepository.manager.transaction(async (manager) => {
      const operating_schedule = await manager.getRepository(OperatingSchedule).find({
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
          }))
          .filter((element) => element.weekday_ref === weekdayRef);

        for (const operatingSchedule of operatingScheduleOfDay) {
          const [hours, minutes] = operatingSchedule.hour.split(':').map(Number);
          const startHour = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          const endHour = `${((hours + 1) % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

          const newCourtSchedule: CreateCourtScheduleDto = {
            date: new Date(currentDate.toISOString().split('T')[0]),
            start_hour: startHour,
            end_hour: endHour,
            day_of_week_id: operatingSchedule.weekday_id,
            price: operatingSchedule.price,
            court_id,
            available: !operatingSchedule.is_fixed,
            is_fixed: operatingSchedule.is_fixed,
            company_customer_id: operatingSchedule.is_fixed ? operatingSchedule.company_customer_id : null,
          };
          newsCourtSchedule.push(newCourtSchedule);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      let createdSchedules;
      try {
        const createdSchedulesRaw = await manager.getRepository(CourtSchedule).save(newsCourtSchedule);

        const createdSchedules = await manager.getRepository(CourtSchedule).find({
          where: { id: In(createdSchedulesRaw.map(s => s.id)) },
          relations: { company_customer: true },
        });

        for (const schedule of createdSchedules) {
          if (schedule.is_fixed && schedule.company_customer_id) {
            reservationsToCreate.push({
              court_schedule: schedule,
              contact_name: schedule.company_customer?.name,
              contact_phone: schedule.company_customer?.phone,
            });
          }
        }

        if (reservationsToCreate.length > 0) {
          await manager.getRepository(Reservation).save(reservationsToCreate);
        }
      } catch (error) {
        throw error;
      }

      return createdSchedules;
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const courts = await this.courtRepository.find();
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 29);

    console.log(`Iniciando verificação de horários faltantes para ${courts.length} quadras`);

    for (const court of courts) {
      const operatingSchedule = await this.operatingScheduleRepository.find({
        where: { court_id: court.id },
        relations: { day_of_week: true },
      });

      for (
        let d = new Date(today);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const weekdayRef = d.getDay();
        console.log('weekdayRef', weekdayRef);

        const expectedSlots = operatingSchedule.filter(
          (os) => os.day_of_week.ref === weekdayRef
        );

        if (expectedSlots.length === 0) {
          continue;
        }

        const existingSchedulesCount = await this.courtSchedulesRepository.count({
          where: {
            court_id: court.id,
            date: new Date(d.toISOString().split('T')[0]),
          },
        });

        if (existingSchedulesCount < expectedSlots.length) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            await this.populateCourtSchedule(court.id, dateStr, dateStr);
            console.log(`Criados horários faltantes para quadra ${court.id} no dia ${dateStr}`);
          } catch (error) {
            console.error(`Erro ao popular quadra ${court.id} no dia ${dateStr}:`, error.message);
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
      relations: { day_of_week: true, court: true, reservation: true },
      select: {
        id: true,
        public_id: true,
        date: true,
        start_hour: true,
        end_hour: true,
        available: true,
        is_fixed: true,
        reservation: {
          is_prepaid: true,
          contact_name: true,
          contact_phone: true,
          token_to_cancel: true,
          created_at: true,
        },
        court: {
          name: true,
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
      reservation: courtSchedule.reservation ? {
        createdAt: formatDateTimestampToDDMMYYYY(courtSchedule?.reservation?.created_at),
        isPrepaid: courtSchedule.reservation?.is_prepaid,
        contactName: courtSchedule.reservation?.contact_name,
        contactPhone: courtSchedule.reservation?.contact_phone,
        tokenToCancel: courtSchedule.reservation?.token_to_cancel,
      } : null,
      court: courtSchedule.court.name,
      time: courtSchedule.start_hour.slice(0, 5),
      price: courtSchedule.price,
      weekday: courtSchedule.day_of_week.description
    }



    return instanceToPlain(obj);
  }

  async updateByPublicId(publicId: string, updateCourtScheduleDto: UpdateCourtScheduleDto) {
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
      { available }
    );
  }

  async fixSchedule(body: {
    court_schedule_id: number;
    company_customer_id?: number;
    customer?: { name: string; phone: string; email?: string; company_id: number };
  }) {
    return await this.courtSchedulesRepository.manager.transaction(async (manager) => {
      let companyCustomerId = body.company_customer_id;

      if (!companyCustomerId && body.customer) {
        const customerRepo = manager.getRepository(CompanyCustomer);
        const customer = customerRepo.create(body.customer);
        const saved = await customerRepo.save(customer);
        companyCustomerId = saved.id;
      }

      if (!companyCustomerId) {
        throw new NotFoundException('É necessário informar ou criar um cliente');
      }

      const courtSchedule = await manager.getRepository(CourtSchedule).findOne({
        where: { id: body.court_schedule_id },
      });
      if (!courtSchedule) throw new NotFoundException('CourtSchedule não encontrado');
      courtSchedule.is_fixed = true;
      courtSchedule.company_customer_id = companyCustomerId;
      await manager.getRepository(CourtSchedule).save(courtSchedule);

      const operatingSchedule = await manager.getRepository(OperatingSchedule).findOne({
        where: {
          court_id: courtSchedule.court_id,
          day_of_week_id: courtSchedule.day_of_week_id,
          hour: courtSchedule.start_hour
        },
        relations: ['company_customer'],
      });
      if (!operatingSchedule) throw new NotFoundException('OperatingSchedule não encontrado');
      operatingSchedule.is_fixed = true;
      operatingSchedule.company_customer_id = companyCustomerId;
      await manager.getRepository(OperatingSchedule).save(operatingSchedule);

      const schedules = await manager.getRepository(CourtSchedule).find({
        where: {
          is_fixed: true,
          company_customer_id: companyCustomerId,
          start_hour: courtSchedule.start_hour,
          day_of_week_id: courtSchedule.day_of_week_id,
          court_id: courtSchedule.court_id,
        },
      });

      for (const sched of schedules) {
        const exists = await manager.getRepository(Reservation).findOne({
          where: {
            court_schedule: { id: sched.id },
          },
        });
        if (!exists) {
          let contactName: string | undefined;
          let contactPhone: string | undefined;

          if (body?.customer) {
            contactName = body.customer.name;
            contactPhone = body.customer.phone;
          } else if (operatingSchedule?.company_customer) {
            contactName = operatingSchedule.company_customer.name;
            contactPhone = operatingSchedule.company_customer.phone;
          } else if (body.company_customer_id) {
            const customerRepo = manager.getRepository(CompanyCustomer);
            const customer = await customerRepo.findOne({ where: { id: body.company_customer_id } });
            if (customer) {
              contactName = customer.name;
              contactPhone = customer.phone;
            }
          }

          if (!contactName || !contactPhone) {
            throw new NotFoundException('É necessário informar ou criar um cliente com nome e telefone');
          }

          const reservationRepo = manager.getRepository(Reservation);
          const reservation = reservationRepo.create({
            court_schedule: sched,
            contact_name: contactName,
            contact_phone: contactPhone,
          });
          await reservationRepo.save(reservation);
          reservation.token_to_cancel = this.jwtService.generateToken(reservation.id);
          await reservationRepo.save(reservation);
        }
      }

      return { message: 'Horário fixado com sucesso', company_customer_id: companyCustomerId };
    });
  }

  async unfixSchedule(body: {
    court_schedule_id: number;
  }) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { id: body.court_schedule_id },
    });
    if (!courtSchedule) throw new NotFoundException('CourtSchedule não encontrado');
    courtSchedule.is_fixed = false;
    courtSchedule.company_customer_id = null;
    await this.courtSchedulesRepository.save(courtSchedule);

    const operatingSchedule = await this.operatingScheduleRepository.findOne({
      where: {
        court_id: courtSchedule.court_id,
        day_of_week_id: courtSchedule.day_of_week_id,
        hour: courtSchedule.start_hour
      },
    });
    if (!operatingSchedule) throw new NotFoundException('OperatingSchedule não encontrado');
    operatingSchedule.is_fixed = false;
    operatingSchedule.company_customer_id = null;
    await this.operatingScheduleRepository.save(operatingSchedule);

    await this.reservationRepository.delete({
      court_schedule: { id: courtSchedule.id },
    });

    return { message: 'Horário desafixado com sucesso' };
  }
}
