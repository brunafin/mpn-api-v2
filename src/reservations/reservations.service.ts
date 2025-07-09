import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { plainToInstance } from 'class-transformer';
import { ZenviaService } from 'src/zenvia-sms/zenvia-sms.service';
import { checkIsCellphoneNumberBR } from 'src/utils/checkIsCellphoneNumberBR';
import { normalizeText } from 'src/utils/normalizeText';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    private readonly jwtService: JwtService,
    private readonly twilioService: TwilioService,
    private readonly zenviaService: ZenviaService,
    private readonly dataSource: DataSource,
  ) {}
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

      const reservation = this.reservationsRepository.create({
        contact_name: createReservationDto.contactName,
        contact_phone: createReservationDto.contactPhone.trim().length > 0 ? createReservationDto.contactPhone : courtSchedule.court.company.phone,
        court_schedule_id: courtSchedule.id,
        observation:
          createReservationDto.observation &&
          createReservationDto.observation?.length > 0
            ? createReservationDto.observation
            : undefined,
        is_barbecue_included: createReservationDto.isBarbecueIncluded,
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
        `${
          courtSchedule.date instanceof Date
            ? courtSchedule.date.toLocaleDateString('pt-BR')
            : new Date(courtSchedule.date).toLocaleDateString('pt-BR')
        } - ${startHourFormatted}\n` +
        `Valor: ${formattedPrice}`;

      if (createReservationDto.isBarbecueIncluded) {
        message = message + '\nc/ churrasq.';
      }

      if (checkIsCellphoneNumberBR(createReservationDto.contactPhone)) {
        if (process.env.TYPE_ENV !== 'production') {
          await this.twilioService.sendSms(
            createReservationDto.contactPhone,
            'Essa mensagem é um teste\n' + message,
          );
        } else {
          await this.zenviaService.sendSms(
            createReservationDto.contactPhone,
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
        { available: true, is_fixed: false, company_customer_id: null },
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
        `${
          courtSchedule?.date instanceof Date
            ? courtSchedule.date.toLocaleDateString('pt-BR')
            : new Date(courtSchedule?.date ?? '').toLocaleDateString('pt-BR')
        } - ${startHourFormatted}\n` +
        `Valor: ${formattedPrice}`;

      if (reservation.is_barbecue_included) {
        message = message + '\nc/ churrasq.';
      }

      if(checkIsCellphoneNumberBR(reservation.contact_phone)){
        if (process.env.TYPE_ENV !== 'production') {
          await this.twilioService.sendSms(
            reservation.contact_phone,
            'Essa mensagem é um teste\n' + message,
          );
        } else {
          await this.zenviaService.sendSms(reservation.contact_phone, message);
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
    fields: { observation?: string; is_barbecue_included?: boolean },
  ) {
    const updateData: any = {};
    if (fields.observation !== undefined)
      updateData.observation = fields.observation;
    if (fields.is_barbecue_included !== undefined)
      updateData.is_barbecue_included = fields.is_barbecue_included;
    return this.reservationsRepository.update({ public_id }, updateData);
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
