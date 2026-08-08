import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { DataSource, MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { plainToInstance } from 'class-transformer';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';
import { sanitizePersonName } from 'src/utils/sanitize-person-name';
import {
  OBSERVATION_MAX_LENGTH,
  sanitizeNoteText,
} from 'src/utils/sanitize-note-text';
import { normalizeOptionalContactPhone } from 'src/utils/normalize-contact-phone';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,

    private readonly dataSource: DataSource,
    private readonly publicListingCache: PublicListingCache,
  ) {}
  async create(
    createReservationDto: CreateReservationDto,
    ownerPublicId: string,
  ) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Lock só em court_schedule: Postgres não permite FOR UPDATE no lado
      // nullable de OUTER JOIN (ex.: leftJoin em administrator).
      const courtSchedule = await queryRunner.manager
        .getRepository(CourtSchedule)
        .createQueryBuilder('cs')
        .innerJoinAndSelect('cs.court', 'court')
        .innerJoinAndSelect('court.company', 'company')
        .leftJoinAndSelect('company.administrator', 'administrator')
        .setLock('pessimistic_write', undefined, ['cs'])
        .where('cs.public_id = :publicId', {
          publicId: createReservationDto.courtSchedulePublicId,
        })
        .getOne();

      if (!courtSchedule) {
        throw new NotFoundException('Horário não encontrado');
      }

      assertAdministratorOwns(
        courtSchedule.court.company.administrator?.public_id,
        ownerPublicId,
      );

      if (!courtSchedule.available) {
        throw new BadRequestException('Horário indisponível');
      }

      await queryRunner.manager.update(
        this.courtSchedulesRepository.target,
        courtSchedule.id,
        { available: false },
      );

      const contactPhone = normalizeOptionalContactPhone(
        createReservationDto.contactPhone,
      );

      const contactName = sanitizePersonName(createReservationDto.contactName);
      if (!contactName) {
        throw new BadRequestException('Informe o nome do cliente');
      }

      const observationRaw = sanitizeNoteText(
        createReservationDto.observation ?? '',
        OBSERVATION_MAX_LENGTH,
      );
      const observation = observationRaw.length > 0 ? observationRaw : undefined;

      const reservation = this.reservationsRepository.create({
        contact_name: contactName,
        contact_phone: contactPhone,
        court_schedule_id: courtSchedule.id,
        observation,
        is_barbecue_included: createReservationDto.isBarbecueIncluded,
        is_event: createReservationDto.isEvent,
        sport_id: createReservationDto.sportId,
      });

      await queryRunner.manager.save(
        this.reservationsRepository.target,
        reservation,
      );

      await queryRunner.commitTransaction();
      this.publicListingCache.clear();
      return plainToInstance(Reservation, reservation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Erro ao criar reserva: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async cancelByPublicId(publicId: string, ownerPublicId: string) {
    const owned = await this.assertReservationOwnedBy(publicId, ownerPublicId);

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: owned.id },
        select: {
          id: true,
          court_schedule_id: true,
        },
      });

      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      await queryRunner.manager.remove(Reservation, reservation);
      await queryRunner.manager.update(
        CourtSchedule,
        reservation.court_schedule_id,
        {
          available: true,
          is_fixed: false,
          fixed_contact_name: null,
          fixed_contact_phone: null,
          sport_id: null,
        },
      );

      await queryRunner.commitTransaction();
      this.publicListingCache.clear();
      return { message: 'Reserva cancelada com sucesso!' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOneByPublicId(public_id: string, ownerPublicId: string) {
    const reservation = await this.assertReservationOwnedBy(
      public_id,
      ownerPublicId,
    );
    return plainToInstance(Reservation, reservation);
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  private async assertReservationOwnedBy(
    publicId: string,
    ownerPublicId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { public_id: publicId },
      relations: {
        court_schedule: { court: { company: { administrator: true } } },
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    assertAdministratorOwns(
      reservation.court_schedule?.court?.company?.administrator?.public_id,
      ownerPublicId,
    );
    return reservation;
  }

  updateByPublicId(
    public_id: string,
    updateReservationDto: UpdateReservationDto,
    ownerPublicId: string,
  ) {
    return this.assertReservationOwnedBy(public_id, ownerPublicId).then(() => {
      const contactName = sanitizePersonName(
        updateReservationDto.contactName ?? '',
      );
      if (!contactName) {
        throw new BadRequestException('Informe o nome do cliente');
      }
      const contactPhone = normalizeOptionalContactPhone(
        updateReservationDto.contactPhone,
      );
      return this.reservationsRepository.update(
        { public_id },
        {
          contact_name: contactName,
          contact_phone: contactPhone,
        },
      );
    });
  }

  async updateExtraFields(
    public_id: string,
    fields: {
      observation?: string;
      is_barbecue_included?: boolean;
      is_event?: boolean;
    },
    ownerPublicId: string,
  ) {
    await this.assertReservationOwnedBy(public_id, ownerPublicId);
    const updateData: any = {};
    if (fields.observation !== undefined) {
      updateData.observation = fields.observation
        ? sanitizeNoteText(fields.observation, OBSERVATION_MAX_LENGTH)
        : fields.observation;
    }
    if (fields.is_barbecue_included !== undefined)
      updateData.is_barbecue_included = fields.is_barbecue_included;
    if (fields.is_event !== undefined) updateData.is_event = fields.is_event;
    return this.reservationsRepository.update({ public_id }, updateData);
  }

  async remove(id: number, ownerPublicId: string) {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: {
        court_schedule: { court: { company: { administrator: true } } },
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    assertAdministratorOwns(
      reservation.court_schedule?.court?.company?.administrator?.public_id,
      ownerPublicId,
    );
    await this.reservationsRepository.delete({ id });
    return { message: 'Reserva removida' };
  }

  async updateContact(
    courtSchedulePublicId: string,
    contactNameRaw: string,
    contactPhone: string | null | undefined,
    ownerPublicId: string,
  ) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { public_id: courtSchedulePublicId },
      relations: { court: { company: { administrator: true } } },
    });
    if (!courtSchedule) {
      throw new NotFoundException('Horário não encontrado.');
    }
    assertAdministratorOwns(
      courtSchedule.court?.company?.administrator?.public_id,
      ownerPublicId,
    );

    const contactName = sanitizePersonName(contactNameRaw);
    if (!contactName) {
      throw new BadRequestException('Informe o nome do cliente');
    }

    const contactPhoneOptional = normalizeOptionalContactPhone(contactPhone);

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

      const scheduleIds = allSchedules.map((s) => s.id);

      await this.operatingScheduleRepository
        .createQueryBuilder()
        .update()
        .set({
          fixed_contact_name: contactName,
          fixed_contact_phone: contactPhoneOptional,
        })
        .where('hour = :hour', { hour: courtSchedule.start_hour })
        .andWhere('court_id = :courtId', { courtId: courtSchedule.court_id })
        .andWhere('day_of_week_id = :dayOfWeekId', {
          dayOfWeekId: courtSchedule.day_of_week_id,
        })
        .execute();

      if (scheduleIds.length > 0) {
        await this.courtSchedulesRepository
          .createQueryBuilder()
          .update()
          .set({
            fixed_contact_name: contactName,
            fixed_contact_phone: contactPhoneOptional,
          })
          .where('id IN (:...ids)', { ids: scheduleIds })
          .execute();

        await this.reservationsRepository
          .createQueryBuilder()
          .update()
          .set({
            contact_name: contactName,
            contact_phone: contactPhoneOptional,
          })
          .where('court_schedule_id IN (:...ids)', { ids: scheduleIds })
          .execute();
      }
    } else {
      const reservation = await this.reservationsRepository.findOne({
        where: { court_schedule_id: courtSchedule.id },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada.');
      }
      reservation.contact_name = contactName;
      reservation.contact_phone = contactPhoneOptional;
      await this.reservationsRepository.save(reservation);
    }
  }
}
