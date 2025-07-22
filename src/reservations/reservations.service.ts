import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { DataSource, MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { plainToInstance } from 'class-transformer';
import { ZenviaService } from 'src/zenvia-sms/zenvia-sms.service';
import { checkIsCellphoneNumberBR } from 'src/utils/checkIsCellphoneNumberBR';
import { normalizeText } from 'src/utils/normalizeText';
import { CompanyCustomer } from 'src/companies-customer/entities/company-customer.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    @InjectRepository(CompanyCustomer)
    private readonly companyCustomerRepository: Repository<CompanyCustomer>,
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,

    private readonly jwtService: JwtService,
    private readonly twilioService: TwilioService,
    private readonly zenviaService: ZenviaService,
    private readonly dataSource: DataSource,
  ) { }
  async create(createReservationDto: CreateReservationDto) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const courtSchedule = await this.courtSchedulesRepository.findOne({
        where: { public_id: createReservationDto.courtSchedulePublicId },
        select: {
          id: true,
          public_id: true,
          available: true,
          court: {
            id: true,
            name: true,
            company: {
              email: true,
              name: true,
              phone: true,
            },
          },
          start_hour: true,
          date: true,
          price: true,
        },
        relations: ['court', 'court.company'],
      });

      if (!courtSchedule) {
        throw new NotFoundException('Horário não encontrado');
      }

      if (!courtSchedule.available) {
        throw new BadRequestException('Horário indisponível');
      }

      await queryRunner.manager.update(
        this.courtSchedulesRepository.target,
        courtSchedule.id,
        { available: false },
      );

      // Normaliza o telefone de contato conforme as regras especificadas
      let contactPhone = createReservationDto.contactPhone?.replace(/\s+/g, '') || '';

      if (!contactPhone) {
        contactPhone = courtSchedule.court.company.phone.replace(/\s+/g, '');
      } else if (contactPhone.length === 9 && contactPhone.startsWith('9')) {
        contactPhone = '51' + contactPhone;
      }

      const reservation = this.reservationsRepository.create({
        contact_name: createReservationDto.contactName,
        contact_phone: contactPhone,
        court_schedule_id: courtSchedule.id,
        observation:
          createReservationDto.observation &&
            createReservationDto.observation?.length > 0
            ? createReservationDto.observation
            : undefined,
        is_barbecue_included: createReservationDto.isBarbecueIncluded,
        is_event: createReservationDto.isEvent,
        sport_id: createReservationDto.sportId,
      });
      reservation.token_to_cancel = this.jwtService.generateToken(
        reservation.id,
      );

      await queryRunner.manager.save(
        this.reservationsRepository.target,
        reservation,
      );

      const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(courtSchedule.price);

      const startHourFormatted = courtSchedule.start_hour
        ? courtSchedule.start_hour.slice(0, 5)
        : '';

      let message =
        `Reserva confirmada!\n` +
        `Quadra: ${normalizeText(courtSchedule?.court.company.name)} - Q.${courtSchedule.court.name}\n` +
        `${courtSchedule.date instanceof Date
          ? courtSchedule.date.toLocaleDateString('pt-BR')
          : new Date(courtSchedule.date).toLocaleDateString('pt-BR')
        } - ${startHourFormatted}\n` +
        `Valor: ${formattedPrice}`;

      if (createReservationDto.isBarbecueIncluded) {
        message = message + '\nc/ churrasq.';
      }

      if (createReservationDto.contactPhone.replace(/\s+/g, '').length > 0 && checkIsCellphoneNumberBR(contactPhone)) {
        if (process.env.TYPE_ENV !== 'production') {
          await this.twilioService.sendSms(
            contactPhone,
            'Essa mensagem é um teste\n' + message,
          );
        } else {
          await this.zenviaService.sendSms(
            contactPhone,
            message,
          );
        }
      }

      await queryRunner.commitTransaction();
      return plainToInstance(Reservation, reservation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Erro ao criar reserva: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async findByToken(token: string) {
    const reservation = await this.reservationsRepository.findOne({
      where: { token_to_cancel: token },
      select: {
        id: true,
        contact_name: true,
        contact_phone: true,
        token_to_cancel: true,
        court_schedule: {
          date: true,
          start_hour: true,
          court: {
            name: true,
          },
        },
      },
      relations: ['court_schedule', 'court_schedule.court'],
    });
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    return {
      reservationId: reservation.id,
      date: reservation.court_schedule.date,
      time: reservation.court_schedule.start_hour,
      contactName: reservation.contact_name,
      contactPhone: reservation.contact_phone,
      courtName: reservation.court_schedule.court.name,
      tokenToCancel: reservation.token_to_cancel,
    };
  }

  async cancel(token: string) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { token_to_cancel: token },
        select: {
          id: true,
          token_to_cancel: true,
          court_schedule_id: true,
          contact_name: true,
          contact_phone: true,
          is_barbecue_included: true,
          court_schedule: {
            court: {
              company: {
                name: true,
              },
            },
          },
        },
        relations: { court_schedule: true },
      });

      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      await queryRunner.manager.remove(Reservation, reservation);
      await queryRunner.manager.update(
        CourtSchedule,
        reservation.court_schedule_id,
        { available: true, is_fixed: false, company_customer_id: null, sport_id: null },
      );

      const courtSchedule = await this.courtSchedulesRepository.findOne({
        where: { id: reservation.court_schedule_id },
        relations: ['court', 'court.company'],
      });

      const formattedPrice = courtSchedule
        ? new Intl.NumberFormat('pt-BR', {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(courtSchedule.price)
        : '';

      const startHourFormatted = courtSchedule?.start_hour
        ? courtSchedule.start_hour.slice(0, 5)
        : '';

      let message =
        `Reserva cancelada!\n` +
        `Quadra: ${normalizeText(courtSchedule?.court.company.name!)} - Q.${courtSchedule?.court.name}\n` +
        `${courtSchedule?.date instanceof Date
          ? courtSchedule.date.toLocaleDateString('pt-BR')
          : new Date(courtSchedule?.date ?? '').toLocaleDateString('pt-BR')
        } - ${startHourFormatted}\n` +
        `Valor: ${formattedPrice}`;

      if (reservation.is_barbecue_included) {
        message = message + '\nc/ churrasq.';
      }

      if (checkIsCellphoneNumberBR(reservation.contact_phone)) {
        if (process.env.TYPE_ENV !== 'development') {
          if (process.env.TYPE_ENV !== 'production') {
            await this.twilioService.sendSms(
              reservation.contact_phone,
              'Essa mensagem é um teste\n' + message,
            );
          } else {
            await this.zenviaService.sendSms(reservation.contact_phone, message);
          }
        }
      }


      await queryRunner.commitTransaction();
      return 'Reserva cancelada com sucesso!';
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all reservations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservation`;
  }

  findOneByPublicId(public_id: string) {
    const reservation = this.reservationsRepository.findOne({
      where: { public_id },
    });
    return plainToInstance(Reservation, reservation);
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  updateByPublicId(
    public_id: string,
    updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsRepository.update(
      { public_id },
      {
        contact_name: updateReservationDto.contactName,
        contact_phone: updateReservationDto.contactPhone,
      },
    );
  }

  async updateExtraFields(
    public_id: string,
    fields: { observation?: string; is_barbecue_included?: boolean; is_event?: boolean },
  ) {
    const updateData: any = {};
    if (fields.observation !== undefined)
      updateData.observation = fields.observation;
    if (fields.is_barbecue_included !== undefined)
      updateData.is_barbecue_included = fields.is_barbecue_included;
    if (fields.is_event !== undefined)
      updateData.is_event = fields.is_event;
    return this.reservationsRepository.update({ public_id }, updateData);
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }

  async updateContact(courtSchedulePublicId: string, contactName: string, contactPhone: string) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({ where: { public_id: courtSchedulePublicId }, relations: { court: true } });
    if (!courtSchedule) {
      throw new NotFoundException('Horário não encontrado.');
    }

    let contactPhoneSanitized = contactPhone?.replace(/\s+/g, '') || '';

    if (!contactPhoneSanitized) {
      contactPhoneSanitized = courtSchedule.court.company.phone.replace(/\s+/g, '');
    } else if (contactPhoneSanitized.length === 9 && contactPhoneSanitized.startsWith('9')) {
      contactPhoneSanitized = '51' + contactPhoneSanitized;
    }

    if (courtSchedule.is_fixed) {
      const allSchedules = await this.courtSchedulesRepository.find({
        where: {
          court: { id: courtSchedule.court_id },
          start_hour: courtSchedule.start_hour,
          day_of_week_id: courtSchedule.day_of_week_id,
          is_fixed: true,
          date: MoreThanOrEqual(courtSchedule.date),
        },
        select: ['id'],
      });

      const scheduleIds = allSchedules.map(s => s.id);

      let customerId: number | null = null;
      const foundCustomer = await this.companyCustomerRepository.findOne({
        where: {
          company_id: courtSchedule.court.company_id,
          name: contactName,
          phone: contactPhoneSanitized
        }
      });

      if (!foundCustomer) {
        const newCustomer = await this.companyCustomerRepository.save({
          company_id: courtSchedule.court.company_id,
          name: contactName,
          phone: contactPhoneSanitized
        })
        customerId = newCustomer.id;
      } else {
        customerId = foundCustomer.id;
      }

      await this.operatingScheduleRepository
        .createQueryBuilder()
        .update()
        .set({ company_customer_id: customerId })
        .where('hour = :hour', { hour: courtSchedule.start_hour })
        .andWhere('court_id = :courtId', { courtId: courtSchedule.court_id })
        .andWhere('day_of_week_id = :dayOfWeekId', { dayOfWeekId: courtSchedule.day_of_week_id })
        .execute();

      if (scheduleIds.length > 0) {
        await this.courtSchedulesRepository
          .createQueryBuilder()
          .update()
          .set({ company_customer_id: customerId })
          .where('id IN (:...ids)', { ids: scheduleIds })
          .execute();
      }

      if (scheduleIds.length > 0) {
        await this.reservationsRepository
          .createQueryBuilder()
          .update()
          .set({ contact_name: contactName, contact_phone: contactPhoneSanitized })
          .where('court_schedule_id IN (:...ids)', { ids: scheduleIds })
          .execute();
      }
    } else {
      const reservation = await this.reservationsRepository.findOne({ where: { court_schedule_id: courtSchedule.id } });
      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada.');
      }
      reservation.contact_name = contactName;
      reservation.contact_phone = contactPhoneSanitized;
      await this.reservationsRepository.save(reservation);
    }
  }
}
