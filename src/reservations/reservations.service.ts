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
import { EmailService } from 'src/email/email.service';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) { }
  async create(createReservationDto: CreateReservationDto) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const courtSchedule = await this.courtSchedulesRepository.findOne({
        where: { public_id: createReservationDto.court_schedule_public_id },
        select: {
          id: true,
          public_id: true,
          available: true,
          court: {
            id: true,
            name: true,
            company: {
              email: true,
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

      const reservation =
        this.reservationsRepository.create({ ...createReservationDto, court_schedule_id: courtSchedule.id });
      reservation.token_to_cancel = this.jwtService.generateToken(
        reservation.id,
      );

      await queryRunner.manager.save(
        this.reservationsRepository.target,
        reservation,
      );

      const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(courtSchedule.price);

      await this.emailService.sendEmailNewReservation({
        contactName: reservation.contact_name,
        contactPhone: reservation.contact_phone,
        tokenToCancel: reservation.token_to_cancel,
        courtEmail: courtSchedule.court.company.email,
        amount: formattedPrice,
        courtName: courtSchedule.court.name,
        date: String(courtSchedule.date),
        time: courtSchedule.start_hour,
        subjectPrefix: 'Reserva',
      });

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
        { available: true },
      );

      const courtSchedule = await this.courtSchedulesRepository.findOne({
        where: { id: reservation.court_schedule_id },
        relations: ['court', 'court.company'],
      });

      if (courtSchedule) {
        await this.emailService.sendEmailCanceledReservation({
          companyName: courtSchedule.court.company.name,
          contactName: reservation.contact_name,
          contactPhone: reservation.contact_phone,
          courtEmail: courtSchedule.court.company.email,
          courtName: courtSchedule.court.name,
          date: String(courtSchedule.date),
          time: courtSchedule.start_hour,
          subjectPrefix: 'Cancelamento de Reserva',
        });
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
    })
    return plainToInstance(Reservation, reservation);
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  updateByPublicId(public_id: string, updateReservationDto: UpdateReservationDto) {
    return this.reservationsRepository.update(
      { public_id },
      { ...updateReservationDto },
    );
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
