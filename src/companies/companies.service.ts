import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { getStatusCourtSchedule } from 'src/utils/getStatusCourtSchedulet';
import { ReservationStatusEnum } from 'src/court-schedules/court-schedules.service';
import { getInstagramUserFromUrl } from 'src/utils/getInstagramUserFromUrl';

export interface IReservationItemProps {
  scheduleId: string;
  status: ReservationStatusEnum;
  date: Date;
  court: string;
  time: string;
  customerName: string | null;
  isBarbecueIncluded?: boolean;
  isEvent?: boolean;
  isNeedsNetting?: boolean;
  isHiddenInactiveHours?: boolean;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) { }

  create(createCompanyDto: CreateCompanyDto) {
    const company = this.companiesRepository.create(createCompanyDto);
    return this.companiesRepository.save(company);
  }

  async findAll() {
    const list = await this.companiesRepository.find();
    return plainToInstance(Company, list, {
      excludeExtraneousValues: true,
    });
  }

  async findOneByPublicId(uuid: string) {
    const company = await this.companiesRepository.findOne({
      where: { public_id: uuid },
      relations: ['administrator', 'images'],
      select: {
        administrator: {
          id: true,
          name: true,
        },
        images: {
          url: true,
        },
      },
    });

    if (!company) {
      throw new NotFoundException();
    }

    return plainToInstance(Company, company, {
      exposeUnsetFields: true,
    });
  }

  async findSchedulesByDate(publicId: string, date: string): Promise<IReservationItemProps[]> {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.courts', 'court')
      .leftJoinAndSelect('court.court_schedule', 'schedule', 'schedule.date = :date', {
        date: new Date(date).toISOString().split('T')[0],
      })
      .leftJoinAndSelect('schedule.reservation', 'reservation')
      .leftJoinAndSelect('reservation.sport', 'sport')
      .where('company.public_id = :publicId', { publicId })
      .andWhere('schedule.id IS NOT NULL')
      .select([
        'company.id',
        'company.public_id',
        'company.preferences_is_hidden_inactive_hours',
        'court.id',
        'court.public_id',
        'court.name',
        'schedule.public_id',
        'schedule.start_hour',
        'schedule.date',
        'schedule.available',
        'schedule.price',
        'schedule.is_fixed',
        'reservation.id',
        'reservation.public_id',
        'reservation.contact_name',
        'reservation.contact_phone',
        'reservation.token_to_cancel',
        'reservation.created_at',
        'reservation.is_prepaid',
        'reservation.observation',
        'reservation.is_barbecue_included',
        'reservation.is_event',
        'sport.needsNet'
      ])
      .getOne();

    const reservations: IReservationItemProps[] = company?.courts.flatMap((court) => {
      const isHiddenInactiveHours = company.preferences_is_hidden_inactive_hours;

      return court.court_schedule
        .filter(schedule => {
          const status = getStatusCourtSchedule(schedule);
          return !(isHiddenInactiveHours && status === ReservationStatusEnum.INACTIVE);
        })
        .map(schedule => ({
          scheduleId: schedule.public_id,
          status: getStatusCourtSchedule(schedule),
          date: schedule.date,
          court: court.name,
          time: schedule.start_hour.slice(0, 5),
          customerName: schedule.reservation?.contact_name ?? null,
          isBarbecueIncluded: schedule.reservation?.is_barbecue_included ?? false,
          isEvent: schedule.reservation?.is_event ?? false,
          isNeedsNetting: schedule.reservation?.sport?.needsNet ?? false,
        }));
    }).sort((a, b) => a.time.localeCompare(b.time)) ?? [];

    return reservations ?? [];
  }

  async findAllSchedulesByDate(publicId: string, date: string): Promise<IReservationItemProps[]> {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.courts', 'court')
      .leftJoinAndSelect('court.court_schedule', 'schedule', 'schedule.date = :date', {
        date: new Date(date).toISOString().split('T')[0],
      })
      .leftJoinAndSelect('schedule.reservation', 'reservation')
      .leftJoinAndSelect('reservation.sport', 'sport')
      .where('company.public_id = :publicId', { publicId })
      .andWhere('schedule.id IS NOT NULL')
      .select([
        'company.id',
        'company.public_id',
        'company.preferences_is_hidden_inactive_hours',
        'court.id',
        'court.public_id',
        'court.name',
        'schedule.public_id',
        'schedule.start_hour',
        'schedule.date',
        'schedule.available',
        'schedule.price',
        'schedule.is_fixed',
        'reservation.id',
        'reservation.public_id',
        'reservation.contact_name',
        'reservation.contact_phone',
        'reservation.token_to_cancel',
        'reservation.created_at',
        'reservation.is_prepaid',
        'reservation.observation',
        'reservation.is_barbecue_included',
        'reservation.is_event',
        'sport.needsNet'
      ])
      .getOne();

    const reservations: IReservationItemProps[] = company?.courts.flatMap((court) => {
      return court.court_schedule
        .map(schedule => ({
          scheduleId: schedule.public_id,
          status: getStatusCourtSchedule(schedule),
          date: schedule.date,
          court: court.name,
          time: schedule.start_hour.slice(0, 5),
          customerName: schedule.reservation?.contact_name ?? null,
          isBarbecueIncluded: schedule.reservation?.is_barbecue_included ?? false,
          isEvent: schedule.reservation?.is_event ?? false,
          isNeedsNetting: schedule.reservation?.sport?.needsNet ?? false,
          isHiddenInactiveHours: company.preferences_is_hidden_inactive_hours,
        }));
    }).sort((a, b) => a.time.localeCompare(b.time)) ?? [];


    return reservations ?? [];
  }

  async updateByPublicId(publicId: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.companiesRepository.findOne({ where: { public_id: publicId } });
    if (!company) {
      throw new NotFoundException();
    }
    this.companiesRepository.merge(company, updateCompanyDto);
    return this.companiesRepository.save(company);
  }

  removeByPublicId(publicId: string) {
    return this.companiesRepository.delete({ public_id: publicId });
  }

  changePreferencesHiddenInactiveHoursByPublicId(publicId: string, isHiddenInactiveHours: boolean) {
    return this.companiesRepository.update({ public_id: publicId }, { preferences_is_hidden_inactive_hours: isHiddenInactiveHours });
  }

  async findInfosByPublicId(uuid: string) {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.plan', 'plan')
      .leftJoinAndSelect('company.payments', 'payments')
      .where('company.public_id = :uuid', { uuid })
      .select([
      'company.name',
      'company.instagram_url',
      'company.preferences_is_hidden_inactive_hours',
      'company.day_due',
      'plan.name',
      'plan.price',
      'payments.dt_payment',
      'payments.price',
      'payments.form_of_payment',
      ])
      .orderBy('payments.dt_payment', 'DESC')
      .getOne();


    if (!company) {
      throw new NotFoundException();
    }

    const objToFront = {
      link: `https://marcapranos.com.br/encontre-onde-jogar/${getInstagramUserFromUrl(company.instagram_url)}`,
      preferences: {
        isHiddenInactiveHours: company.preferences_is_hidden_inactive_hours,
      },
      companyName: company.name,
      plan: {
        name: company.plan?.name || 'Gratuito (Teste)',
        price: company.plan?.price || 0,
        day_due: company?.day_due || null,
        history: company.payments?.map(payment => ({
          date: payment.dt_payment || `${new Date().getFullYear()}-${new Date().getMonth()}-${company.day_due}`,
          value: payment.price,
          form_of_payment: payment.form_of_payment,
          paied: !!payment.dt_payment,
        })) || [],
      }
    }

    return objToFront;
  }
}
