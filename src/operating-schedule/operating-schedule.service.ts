import { Injectable } from '@nestjs/common';
import { CreateOperatingScheduleDto } from './dto/create-operating-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OperatingSchedule } from './entities/operating-schedule.entity';
import { Repository } from 'typeorm';
import { UrlQueryParamOperatingScheduleDto } from './dto/url-query-operating-schedule.dto';

@Injectable()
export class OperatingScheduleService {
  constructor(
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
  ) {}
  create(createOperatingScheduleDto: CreateOperatingScheduleDto) {
    if (
      createOperatingScheduleDto.is_fixed === true &&
      !createOperatingScheduleDto.company_customer_id
    ) {
      throw new Error('Horários fixos devem ter um cliente associado.');
    }
    return this.operatingScheduleRepository.save(createOperatingScheduleDto);
  }

  findAllByCourtId(query: UrlQueryParamOperatingScheduleDto) {
    return this.operatingScheduleRepository.find({
      where: { court_id: query.courtId },
    });
  }
}
