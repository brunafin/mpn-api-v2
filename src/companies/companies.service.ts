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
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { getStatusCourtSchedule } from 'src/utils/getStatusCourtSchedulet';
import { ReservationStatusEnum } from 'src/court-schedules/court-schedules.service';
import { formatDateDateToDDMMYYYY } from 'src/utils/formatDate';

export interface IReservationItemProps {
  scheduleId: string;
  status: ReservationStatusEnum;
  date: Date;
  court: string;
  time: string;
  customerName: string | null;
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
      .where('company.public_id = :publicId', { publicId })
      .andWhere('schedule.id IS NOT NULL')
      .select([
        'company.id',
        'company.public_id',
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
      ])
      .orderBy('schedule.start_hour', 'ASC')
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
        }))
    }
    ).sort((a, b) => a.time.localeCompare(b.time)) ?? [];

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
}
