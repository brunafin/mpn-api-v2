import { Injectable } from '@nestjs/common';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { ILike, Repository } from 'typeorm';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { formatHour } from 'src/utils/formatHour';
import { UrlQueryParamCourtScheduleDto } from './dto/url-query-param-court-schedule.dto';

@Injectable()
export class CourtSchedulesService {
  constructor(
    @InjectRepository(CourtSchedule)
    private readonly courtSchedulesRepository: Repository<CourtSchedule>,
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
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
    const operating_schedule = await this.operatingScheduleRepository.find({
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

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const weekdayRef = currentDate.getDay();

      const operatingScheduleOfDay = operating_schedule
        .map((item) => ({
          hour: item.hour,
          price: item.price,
          weekday_ref: item.day_of_week.ref,
          weekday_id: item.day_of_week_id,
        }))
        .filter((element) => element.weekday_ref === weekdayRef);

      for (const operatingSchedule of operatingScheduleOfDay) {
        const newCourtSchedule: CreateCourtScheduleDto = {
          date: new Date(currentDate.toISOString().split('T')[0]),
          start_hour: formatHour(operatingSchedule.hour),
          end_hour: formatHour(operatingSchedule.hour + 1),
          day_of_week_id: operatingSchedule.weekday_id,
          price: operatingSchedule.price,
          court_id,
          available: true,
        };
        newsCourtSchedule.push(newCourtSchedule);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return this.courtSchedulesRepository.save(newsCourtSchedule);
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

  findOne(id: number) {
    return this.courtSchedulesRepository.findOne({
      where: { id },
      relations: { day_of_week: true },
      select: {
        id: true,
        date: true,
        start_hour: true,
        end_hour: true,
        available: true,
        price: true,
        day_of_week: {
          description: true,
          abbreviation: true,
          ref: true,
        },
      },
    });
  }

  async update(id: number, updateCourtScheduleDto: UpdateCourtScheduleDto) {
    const courtSchedule = await this.courtSchedulesRepository.findOne({
      where: { id },
    });
    if (!courtSchedule) {
      throw new Error('Horário de quadra não encontrado');
    }
    this.courtSchedulesRepository.merge(courtSchedule, updateCourtScheduleDto);
    return this.courtSchedulesRepository.save(courtSchedule);
  }

  remove(id: number) {
    return this.courtSchedulesRepository.delete({ id });
  }
}
