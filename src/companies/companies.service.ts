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

  getStatusCourtSchedule = (courtSchedule: CourtSchedule) => {
    if (courtSchedule.is_fixed) {
      return 'fixed';
    }
    if (courtSchedule.reservation) {
      return 'reserved';
    }
    if (courtSchedule.available) {
      return 'available';
    }
    if (!courtSchedule.available && !courtSchedule.reservation) {
      return 'inactive';
    }
  }

  async findSchedulesByDate(publicId: string, date: string) {
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
      ])
      .getOne();


    const reservations = company?.courts.flatMap((court) => {
      return court.court_schedule
        .map(schedule => ({
          scheduleId: schedule.public_id,
          status: this.getStatusCourtSchedule(schedule),
          date: schedule.date,
          reservationDate: schedule?.reservation?.created_at,
          court: court.name,
          time: schedule.start_hour,
          price: schedule.price,
          customer: {
            name: schedule?.reservation?.contact_name,
            phone: schedule?.reservation?.contact_phone,
          }
        }))
    }
    )

    return reservations;
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
